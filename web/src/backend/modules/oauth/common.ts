import crypto from 'node:crypto';
import type { NextResponse } from 'next/server';
import { prisma } from '@/backend/lib/db';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes, same window as the flow itself

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function setShortLivedCookie(response: NextResponse, name: string, value: string): void {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export function clearShortLivedCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, '', { path: '/', maxAge: 0 });
}

export interface OAuthProfile {
  externalId: string;
  email: string | null;
  /**
   * Whether the provider itself vouches that `email` is verified/owned by this account.
   * Only Google reliably asserts this (`email_verified`). Providers that can't assert it
   * (VK, Yandex) must always pass `false` here — otherwise an attacker could register an
   * account anywhere with someone else's email and get silently linked into their existing
   * HumanType user, taking over their subscription/devices.
   */
  emailVerified: boolean;
  name: string | null;
}

/**
 * Links or creates a User for a given OAuth identity. An existing UserOAuthAccount match wins;
 * otherwise, only when the provider asserts the email is verified, falls back to matching by
 * email (covers the same person signing in via a different provider); otherwise creates a
 * brand new User (never trusting an unverified email for account linking).
 */
export async function findOrCreateUserFromOAuth(provider: string, profile: OAuthProfile): Promise<string> {
  const existingAccount = await prisma.userOAuthAccount.findFirst({
    where: { provider, external_id: profile.externalId },
  });
  if (existingAccount) {
    await prisma.user.update({
      where: { id: existingAccount.user_id },
      data: { last_logined_at: new Date() },
    });
    return existingAccount.user_id;
  }

  const canLinkByEmail = profile.emailVerified && profile.email !== null;
  const existingUser = canLinkByEmail
    ? await prisma.user.findUnique({ where: { email: profile.email! } })
    : null;

  if (existingUser) {
    await prisma.$transaction([
      prisma.userOAuthAccount.create({
        data: { user_id: existingUser.id, provider, external_id: profile.externalId },
      }),
      prisma.user.update({
        where: { id: existingUser.id },
        data: { last_logined_at: new Date() },
      }),
    ]);
    return existingUser.id;
  }

  const created = await prisma.user.create({
    data: {
      // Only store the email if the provider verified it — an unverified email must not end up
      // on the User row, since it could collide with (and later be used to impersonate) another
      // account via a future verified-email login.
      email: canLinkByEmail ? profile.email : null,
      name: profile.name,
      last_logined_at: new Date(),
      oauthAccounts: {
        create: { provider, external_id: profile.externalId },
      },
    },
  });
  return created.id;
}

/** Shared shape for providers using the plain authorization_code grant (Google, Yandex). */
export interface SimpleOAuthConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  redirectPath: string;
  extractProfile: (userInfo: any) => OAuthProfile;
}

export function buildSimpleAuthorizeUrl(config: SimpleOAuthConfig, state: string): string {
  const redirectUri = `${requireEnv('APP_BASE_URL')}${config.redirectPath}`;
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeSimpleCodeForProfile(
  config: SimpleOAuthConfig,
  code: string,
): Promise<OAuthProfile> {
  const redirectUri = `${requireEnv('APP_BASE_URL')}${config.redirectPath}`;

  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`${config.name} token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error(`${config.name} token response missing access_token`);

  const userInfoRes = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) {
    throw new Error(`${config.name} userinfo request failed: ${userInfoRes.status}`);
  }
  const userInfo = await userInfoRes.json();
  return config.extractProfile(userInfo);
}
