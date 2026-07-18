import crypto from 'node:crypto';
import { requireEnv, randomToken, type OAuthProfile } from './common';

// VK ID uses OAuth 2.1 with mandatory PKCE, and echoes back a `device_id` that must be
// replayed during token exchange — unlike the plain authorization_code flow used by
// Google/Yandex, so it isn't a fit for the shared "simple" helpers in common.ts.
const REDIRECT_PATH = '/api/user/oauth/vk/callback';

function sha256Base64Url(input: string): string {
  return crypto.createHash('sha256').update(input).digest('base64url');
}

export interface VkAuthorizeResult {
  url: string;
  codeVerifier: string;
}

export function getVkAuthorizeUrl(state: string): VkAuthorizeResult {
  const clientId = requireEnv('VK_CLIENT_ID');
  const redirectUri = `${requireEnv('APP_BASE_URL')}${REDIRECT_PATH}`;
  const codeVerifier = randomToken(32);
  const codeChallenge = sha256Base64Url(codeVerifier);

  const url = new URL('https://id.vk.com/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 's256');

  return { url: url.toString(), codeVerifier };
}

export async function exchangeVkCode(
  code: string,
  deviceId: string,
  codeVerifier: string,
): Promise<OAuthProfile> {
  const clientId = requireEnv('VK_CLIENT_ID');
  const redirectUri = `${requireEnv('APP_BASE_URL')}${REDIRECT_PATH}`;

  const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
      device_id: deviceId,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`vk token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error('vk token response missing access_token');

  const userInfoRes = await fetch('https://id.vk.com/oauth2/user_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, access_token: accessToken }),
  });
  if (!userInfoRes.ok) throw new Error(`vk userinfo request failed: ${userInfoRes.status}`);
  const data = await userInfoRes.json();
  const user = data.user ?? data;

  return {
    externalId: String(user.user_id ?? user.id),
    email: tokenData.email ?? user.email ?? null,
    // VK ID doesn't assert the email is verified/owned by the account holder, so never use it
    // to auto-link into an existing account (see OAuthProfile.emailVerified).
    emailVerified: false,
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
  };
}
