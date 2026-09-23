import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { audit, createOwnerToken, OWNER_COOKIE, ownerSessionMaxAge } from '@/lib/site-compliance';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!sameOrigin(request)) return NextResponse.json({ success: false, message: 'Unexpected request origin.', requestId }, { status: 403 });
  if (!rateAllowed(request, 'owner-login', 5, 15 * 60_000)) return NextResponse.json({ success: false, message: 'Too many attempts. Try again later.', requestId }, { status: 429 });
  const parsed = await readBoundedJson(request, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ success: false, message: parsed.message, requestId }, { status: parsed.status });
  const { passcode } = parsed.value;
  const expected = (process.env.MACSUNNY_OWNER_PASSCODE || '').trim();
  const supplied = String(passcode || '').trim();
  const valid = Boolean(expected) && supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) {
    await audit('OWNER_LOGIN', false, request, requestId, 'Invalid passcode');
    return NextResponse.json({ success: false, message: 'Invalid owner passcode', requestId }, { status: 401 });
  }
  (await cookies()).set(OWNER_COOKIE, createOwnerToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: ownerSessionMaxAge() });
  await audit('OWNER_LOGIN', true, request, requestId);
  return NextResponse.json({ success: true, requestId });
}
