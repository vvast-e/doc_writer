import { NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, randomToken, setShortLivedCookie } from '@/backend/modules/oauth/common';
import { getVkAuthorizeUrl } from '@/backend/modules/oauth/vk';

const VK_VERIFIER_COOKIE = 'oauth_vk_verifier';

export async function GET() {
  const state = randomToken();
  const { url, codeVerifier } = getVkAuthorizeUrl(state);
  const response = NextResponse.redirect(url);
  setShortLivedCookie(response, OAUTH_STATE_COOKIE, state);
  setShortLivedCookie(response, VK_VERIFIER_COOKIE, codeVerifier);
  return response;
}
