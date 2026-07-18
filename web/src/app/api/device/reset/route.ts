import type { NextRequest } from 'next/server';
import { resetAllDevices } from '@/backend/modules/device';
import { fail, ok } from '@/backend/shared/http';
import { getUserIdFromRequest } from '@/backend/shared/session';

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const result = await resetAllDevices(userId);
  if (!result.ok) {
    if (result.error.code === 'RESET_COOLDOWN_ACTIVE') {
      return fail(
        'RESET_COOLDOWN_ACTIVE',
        `Повторный сброс будет доступен после ${result.error.retryAfter}`,
        429,
      );
    }
    return fail('RESET_FAILED', 'Не удалось сбросить устройства', 400);
  }

  return ok({ reset: true });
}
