import {
  buildSimpleAuthorizeUrl,
  exchangeSimpleCodeForProfile,
  requireEnv,
  type SimpleOAuthConfig,
} from './common';

function getConfig(): SimpleOAuthConfig {
  return {
    name: 'google',
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
    redirectPath: '/api/user/oauth/google/callback',
    extractProfile: (userInfo) => ({
      externalId: userInfo.sub,
      email: userInfo.email ?? null,
      emailVerified: userInfo.email_verified === true,
      name: userInfo.name ?? null,
    }),
  };
}

export function getGoogleAuthorizeUrl(state: string): string {
  return buildSimpleAuthorizeUrl(getConfig(), state);
}

export function exchangeGoogleCode(code: string) {
  return exchangeSimpleCodeForProfile(getConfig(), code);
}
