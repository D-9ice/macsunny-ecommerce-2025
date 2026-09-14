import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { audit, OWNER_COOKIE, ownerToken } from '@/lib/site-compliance';

const attempts = new Map<string, { count: number; reset: number }>();
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.reset > now && entry.count >= 5) return NextResponse.json({ success: false, message: 'Too many attempts. Try again later.', requestId }, { status: 429 });
  const { passcode } = await request.json();
  const expected = process.env.MACSUNNY_OWNER_PASSCODE || '';
  const supplied = String(passcode || '');
  const valid = Boolean(expected) && supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) {
    attempts.set(ip, { count: entry?.reset && entry.reset > now ? entry.count + 1 : 1, reset: now + 15 * 60_000 });
    await audit('OWNER_LOGIN', false, request, requestId, 'Invalid passcode');
    return NextResponse.json({ success: false, message: 'Invalid owner passcode', requestId }, { status: 401 });
  }
  attempts.delete(ip);
  (await cookies()).set(OWNER_COOKIE, ownerToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 });
  await audit('OWNER_LOGIN', true, request, requestId);
  return NextResponse.json({ success: true, requestId });
}
