import type { NextRequest } from 'next/server';
import { listDevices } from '@/backend/modules/device';
import { fail, ok } from '@/backend/shared/http';
import { getUserIdFromRequest } from '@/backend/shared/session';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const devices = await listDevices(userId);
  return ok(devices);
}
