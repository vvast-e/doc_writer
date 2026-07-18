import { NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, randomToken, setShortLivedCookie } from '@/backend/modules/oauth/common';
import { getGoogleAuthorizeUrl } from '@/backend/modules/oauth/google';

export async function GET() {
  const state = randomToken();
  const response = NextResponse.redirect(getGoogleAuthorizeUrl(state));
  setShortLivedCookie(response, OAUTH_STATE_COOKIE, state);
  return response;
}
