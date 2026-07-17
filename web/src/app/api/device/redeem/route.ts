import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { redeemPairingCode } from '@/backend/modules/device';
import { fail, ok } from '@/backend/shared/http';
import { checkRateLimit, getClientIp } from '@/backend/shared/rateLimit';
import { parseJsonBody } from '@/backend/shared/validation';

const bodySchema = z.object({ code: z.string().length(6) });

const REDEEM_RATE_LIMIT = 10;
const REDEEM_RATE_WINDOW_MS = 60_000;

// Defense-in-depth against a distributed brute force of the 6-digit code space (1M
// combinations / 10min TTL) that rotates source IPs to dodge the per-IP limit above.
const REDEEM_GLOBAL_RATE_LIMIT = 60;
const REDEEM_GLOBAL_RATE_WINDOW_MS = 60_000;

function describeError(code: string): string {
  switch (code) {
    case 'INVALID_OR_EXPIRED_CODE':
      return 'Код недействителен или истёк';
    case 'DEVICE_LIMIT_REACHED':
      return 'Достигнут лимит устройств по тарифу';
    default:
      return 'Ошибка';
  }
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit('device-redeem:global', REDEEM_GLOBAL_RATE_LIMIT, REDEEM_GLOBAL_RATE_WINDOW_MS)) {
    return fail('RATE_LIMITED', 'Слишком много попыток, попробуйте позже', 429);
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`device-redeem:${ip}`, REDEEM_RATE_LIMIT, REDEEM_RATE_WINDOW_MS)) {
    return fail('RATE_LIMITED', 'Слишком много попыток, попробуйте позже', 429);
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.success) return fail('INVALID_BODY', parsed.message, 400);

  const result = await redeemPairingCode(parsed.data.code);
  if (!result.ok) {
    const status = result.error.code === 'INVALID_OR_EXPIRED_CODE' ? 404 : 409;
    return fail(result.error.code, describeError(result.error.code), status);
  }

  return ok(result.data);
}
