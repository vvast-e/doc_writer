import { prisma } from '@/backend/lib/db';
import {
  countActiveDevices,
  createPairingCode,
  deactivateAllDevices,
  findValidPairingCode,
  getActiveSubscription,
  getLastResetAt,
  redeemInTransaction,
  RESET_COOLDOWN_MS,
} from './repo';
import type { DeviceServiceError, PairingIssueResult, RedeemResult } from './types';

// Temporary allowance for users without an active subscription — until Phase 4 (payments)
// ships there is no free tier row in the Subscription table to fall back on.
const DEFAULT_MAX_DEVICES_WITHOUT_SUBSCRIPTION = 1;

export async function issuePairingCode(userId: string): Promise<PairingIssueResult> {
  const pairingCode = await createPairingCode(userId);
  return { code: pairingCode.code, expiresAt: pairingCode.expires_at.toISOString() };
}

export async function redeemPairingCode(
  code: string,
): Promise<{ ok: true; data: RedeemResult } | { ok: false; error: DeviceServiceError }> {
  const pairingCode = await findValidPairingCode(code);
  if (!pairingCode) return { ok: false, error: { code: 'INVALID_OR_EXPIRED_CODE' } };

  const activeSubscription = await getActiveSubscription(pairingCode.user_id);
  const maxDevices = activeSubscription?.subscription.max_devices ?? DEFAULT_MAX_DEVICES_WITHOUT_SUBSCRIPTION;

  const activeDeviceCount = await countActiveDevices(pairingCode.user_id);
  if (activeDeviceCount >= maxDevices) {
    return { ok: false, error: { code: 'DEVICE_LIMIT_REACHED', maxDevices } };
  }

  const device = await redeemInTransaction(pairingCode.id, pairingCode.user_id);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: pairingCode.user_id } });

  return {
    ok: true,
    data: {
      token: device.key,
      user: { id: user.id, email: user.email, name: user.name },
      subscription: activeSubscription
        ? {
            subscriptionId: activeSubscription.subscription_id,
            name: activeSubscription.subscription.name,
            maxDevices: activeSubscription.subscription.max_devices,
            expiresAt: activeSubscription.expires_at.toISOString(),
          }
        : null,
    },
  };
}

export async function resetAllDevices(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: DeviceServiceError }> {
  const lastResetAt = await getLastResetAt(userId);
  if (lastResetAt && Date.now() - lastResetAt.getTime() < RESET_COOLDOWN_MS) {
    const retryAfter = new Date(lastResetAt.getTime() + RESET_COOLDOWN_MS).toISOString();
    return { ok: false, error: { code: 'RESET_COOLDOWN_ACTIVE', retryAfter } };
  }

  await deactivateAllDevices(userId);
  return { ok: true };
}
