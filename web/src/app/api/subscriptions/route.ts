import { listSubscriptions } from '@/backend/modules/payment';
import { ok } from '@/backend/shared/http';

export async function GET() {
  const subscriptions = await listSubscriptions();
  return ok(subscriptions);
}
