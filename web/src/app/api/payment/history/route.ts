import type { NextRequest } from 'next/server';
import { listTransactions } from '@/backend/modules/payment';
import { fail, ok } from '@/backend/shared/http';
import { getUserIdFromRequest } from '@/backend/shared/session';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return fail('UNAUTHORIZED', 'Not authenticated', 401);

  const transactions = await listTransactions(userId);
  return ok(transactions);
}
