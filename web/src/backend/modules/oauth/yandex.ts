import {
  buildSimpleAuthorizeUrl,
  exchangeSimpleCodeForProfile,
  requireEnv,
  type SimpleOAuthConfig,
} from './common';

function getConfig(): SimpleOAuthConfig {
  return {
    name: 'yandex',
    clientId: requireEnv('YANDEX_CLIENT_ID'),
    clientSecret: requireEnv('YANDEX_CLIENT_SECRET'),
    authorizeUrl: 'https://oauth.yandex.ru/authorize',
    tokenUrl: 'https://oauth.yandex.ru/token',
    userInfoUrl: 'https://login.yandex.ru/info?format=json',
    scope: 'login:email login:info',
    redirectPath: '/api/user/oauth/yandex/callback',
    extractProfile: (userInfo) => ({
      externalId: String(userInfo.id),
      email: userInfo.default_email ?? userInfo.emails?.[0] ?? null,
      // Yandex's login.yandex.ru/info doesn't expose a verified-email flag we can trust,
      // so never use it to auto-link into an existing account (see OAuthProfile.emailVerified).
      emailVerified: false,
      name: userInfo.real_name ?? userInfo.display_name ?? null,
    }),
  };
}

export function getYandexAuthorizeUrl(state: string): string {
  return buildSimpleAuthorizeUrl(getConfig(), state);
}

export function exchangeYandexCode(code: string) {
  return exchangeSimpleCodeForProfile(getConfig(), code);
}
