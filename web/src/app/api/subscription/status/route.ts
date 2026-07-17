import type { NextRequest } from 'next/server';
import { getSubscriptionStatus } from '@/backend/modules/payment';
import { authenticateDevice } from '@/backend/shared/auth';
import { fail, ok } from '@/backend/shared/http';
import { getUserIdFromRequest } from '@/backend/shared/session';

// Same combined auth as /api/user — the site reads this over the session cookie, the
// desktop app reads it over its device Bearer token. Neither side can mutate anything here.
export async function GET(request: NextRequest) {
  const sessionUserId = getUserIdFromRequest(request);
  const deviceAuth = sessionUserId ? null : await authenticateDevice(request);
  const userId = sessionUserId ?? deviceAuth?.userId;
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const status = await getSubscriptionStatus(userId);
  return ok(status);
}
