import { ok } from '@/backend/shared/http';
import { clearSessionCookie } from '@/backend/shared/session';

export async function POST() {
  const response = ok({ loggedOut: true });
  clearSessionCookie(response);
  return response;
}
