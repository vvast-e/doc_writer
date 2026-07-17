import crypto from 'node:crypto';
import { prisma } from '@/backend/lib/db';

export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
export const RESET_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function generateSixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function createPairingCode(userId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateSixDigitCode();
    try {
      const pairingCode = await prisma.pairingCode.create({
        data: { code, user_id: userId, expires_at: new Date(Date.now() + PAIRING_CODE_TTL_MS) },
      });
      await prisma.deviceKeyAudit.create({
        data: { user_id: userId, key: code, action: 'issued' },
      });
      return pairingCode;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') continue; // code collision, retry
      throw error;
    }
  }
  throw new Error('Failed to generate a unique pairing code after 5 attempts');
}

export async function findValidPairingCode(code: string) {
  return prisma.pairingCode.findFirst({
    where: { code, used_at: null, expires_at: { gt: new Date() } },
  });
}

export async function countActiveDevices(userId: string): Promise<number> {
  return prisma.device.count({ where: { user_id: userId, is_active: true } });
}

export async function getActiveSubscription(userId: string) {
  return prisma.userSubscription.findFirst({
    where: { user_id: userId, is_active: true },
    include: { subscription: true },
  });
}

export async function redeemInTransaction(pairingCodeId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const device = await tx.device.create({
      data: { user_id: userId, key: crypto.randomUUID(), activated_at: new Date(), is_active: true },
    });
    await tx.pairingCode.update({ where: { id: pairingCodeId }, data: { used_at: new Date() } });
    await tx.deviceKeyAudit.create({
      data: { device_id: device.id, user_id: userId, key: device.key, action: 'verified' },
    });
    return device;
  });
}

export async function getLastResetAt(userId: string): Promise<Date | null> {
  const lastReset = await prisma.deviceKeyAudit.findFirst({
    where: { user_id: userId, action: 'reset_all' },
    orderBy: { created_at: 'desc' },
  });
  return lastReset?.created_at ?? null;
}

export async function deactivateAllDevices(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.device.updateMany({ where: { user_id: userId, is_active: true }, data: { is_active: false } }),
    prisma.deviceKeyAudit.create({ data: { user_id: userId, key: '*', action: 'reset_all' } }),
  ]);
}
