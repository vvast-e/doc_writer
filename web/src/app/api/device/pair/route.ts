import type { NextRequest } from 'next/server';
import { issuePairingCode } from '@/backend/modules/device';
import { fail, ok } from '@/backend/shared/http';
import { getUserIdFromRequest } from '@/backend/shared/session';

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const result = await issuePairingCode(userId);
  return ok(result);
}
