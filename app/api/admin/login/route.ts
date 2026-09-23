import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateAdminCredentials } from '@/app/lib/auth';
import { adminCookieName, adminSessionMaxAge, createAdminSessionToken } from '@/app/lib/adminSession';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
    }

    if (!rateAllowed(request, 'admin-login', 8, 15 * 60_000)) {
      return NextResponse.json({ success: false, message: 'Too many sign-in attempts. Try again later.' }, { status: 429 });
    }

    const parsed = await readBoundedJson(request, 4 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status });
    }

    const password = String(parsed.value?.password || '').slice(0, 256);

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password using bcrypt
    const isValid = await validateAdminCredentials(password);

    if (isValid) {
      const cookieStore = await cookies();
      
      const token = await createAdminSessionToken();
      cookieStore.set(adminCookieName(), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: adminSessionMaxAge(),
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    );
  }
}