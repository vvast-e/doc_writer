import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  clearShortLivedCookie,
  findOrCreateUserFromOAuth,
  requireEnv,
} from '@/backend/modules/oauth/common';
import { exchangeYandexCode } from '@/backend/modules/oauth/yandex';
import { setSessionCookie } from '@/backend/shared/session';

export async function GET(request: NextRequest) {
  const baseUrl = requireEnv('APP_BASE_URL');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${baseUrl}/auth?error=oauth_state`);
  }

  try {
    const profile = await exchangeYandexCode(code);
    const userId = await findOrCreateUserFromOAuth('yandex', profile);
    const response = NextResponse.redirect(`${baseUrl}/pair`);
    clearShortLivedCookie(response, OAUTH_STATE_COOKIE);
    setSessionCookie(response, userId);
    return response;
  } catch (error) {
    console.error('Yandex OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/auth?error=oauth_failed`);
  }
}
