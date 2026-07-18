import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPayment } from '@/backend/modules/payment';
import { fail, ok } from '@/backend/shared/http';
import { checkRateLimit, getClientIp } from '@/backend/shared/rateLimit';
import { getUserIdFromRequest } from '@/backend/shared/session';
import { parseJsonBody } from '@/backend/shared/validation';

const bodySchema = z.object({ subscriptionId: z.number().int().positive() });

const CREATE_RATE_LIMIT = 5;
const CREATE_RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const ip = getClientIp(request);
  if (!checkRateLimit(`payment-create:${ip}`, CREATE_RATE_LIMIT, CREATE_RATE_WINDOW_MS)) {
    return fail('RATE_LIMITED', 'Слишком много попыток, попробуйте позже', 429);
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.success) return fail('INVALID_BODY', parsed.message, 400);

  const result = await createPayment(userId, parsed.data.subscriptionId);
  if (!result.ok) {
    const status = result.error.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 : 502;
    const message =
      result.error.code === 'SUBSCRIPTION_NOT_FOUND' ? 'Тариф не найден' : 'Платёжный провайдер недоступен';
    return fail(result.error.code, message, status);
  }

  return ok(result.data);
}
