import crypto from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'htsession';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function createSessionValue(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifySessionValue(value: string | undefined | null): { uid: string } | null {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.uid === 'string' ? { uid: data.uid } : null;
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionValue(value)?.uid ?? null;
}

export function setSessionCookie(response: NextResponse, userId: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionValue(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
