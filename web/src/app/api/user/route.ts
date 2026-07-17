import type { NextRequest } from 'next/server';
import { getUserProfile } from '@/backend/modules/user';
import { authenticateDevice } from '@/backend/shared/auth';
import { fail, ok } from '@/backend/shared/http';
import { getUserIdFromRequest } from '@/backend/shared/session';

// Accessible either via the site's session cookie (browser, /pair page) or a device
// Bearer token (desktop app validating its stored token at startup).
export async function GET(request: NextRequest) {
  const sessionUserId = getUserIdFromRequest(request);
  const deviceAuth = sessionUserId ? null : await authenticateDevice(request);
  const userId = sessionUserId ?? deviceAuth?.userId;
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const profile = await getUserProfile(userId);
  if (!profile) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  return ok(profile);
}
