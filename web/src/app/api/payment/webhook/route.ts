import type { NextRequest } from 'next/server';
import { handleWebhook } from '@/backend/modules/payment';
import { fail, ok } from '@/backend/shared/http';
import { getClientIp } from '@/backend/shared/rateLimit';
import { isYooKassaIp } from '@/backend/shared/ipAllowlist';

// Never trust the webhook body for anything beyond "which payment id should I re-check" —
// handleWebhook re-fetches the authoritative status from the YooKassa API before activating
// anything. The IP allowlist is the only guard YooKassa offers in place of a signature.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!isYooKassaIp(ip)) return fail('FORBIDDEN', 'Source IP not allowed', 403);

  let body: { event?: string; object?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return ok({ received: true });
  }

  const paymentId = body.object?.id;
  if (body.event !== 'payment.succeeded' || !paymentId) {
    return ok({ received: true }); // no-op for events we don't act on
  }

  try {
    await handleWebhook(paymentId);
  } catch (error) {
    console.error('YooKassa webhook processing failed:', error);
    // Still ack with 200: our own error shouldn't make YooKassa hammer retries; the
    // transaction stays "pending" and can be reconciled manually via GET /v3/payments/{id}.
  }

  return ok({ received: true });
}
