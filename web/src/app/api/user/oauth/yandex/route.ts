import { NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, randomToken, setShortLivedCookie } from '@/backend/modules/oauth/common';
import { getYandexAuthorizeUrl } from '@/backend/modules/oauth/yandex';

export async function GET() {
  const state = randomToken();
  const response = NextResponse.redirect(getYandexAuthorizeUrl(state));
  setShortLivedCookie(response, OAUTH_STATE_COOKIE, state);
  return response;
}
