import { NextResponse } from 'next/server';

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/admin', process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000')
  );
  // clear the auth cookie
  res.cookies.set('ms_admin', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
