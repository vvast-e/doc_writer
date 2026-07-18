import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  clearShortLivedCookie,
  findOrCreateUserFromOAuth,
  requireEnv,
} from '@/backend/modules/oauth/common';
import { exchangeVkCode } from '@/backend/modules/oauth/vk';
import { setSessionCookie } from '@/backend/shared/session';

const VK_VERIFIER_COOKIE = 'oauth_vk_verifier';

export async function GET(request: NextRequest) {
  const baseUrl = requireEnv('APP_BASE_URL');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const deviceId = request.nextUrl.searchParams.get('device_id');
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(VK_VERIFIER_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState || !deviceId || !codeVerifier) {
    return NextResponse.redirect(`${baseUrl}/auth?error=oauth_state`);
  }

  try {
    const profile = await exchangeVkCode(code, deviceId, codeVerifier);
    const userId = await findOrCreateUserFromOAuth('vk', profile);
    const response = NextResponse.redirect(`${baseUrl}/pair`);
    clearShortLivedCookie(response, OAUTH_STATE_COOKIE);
    clearShortLivedCookie(response, VK_VERIFIER_COOKIE);
    setSessionCookie(response, userId);
    return response;
  } catch (error) {
    console.error('VK OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/auth?error=oauth_failed`);
  }
}
