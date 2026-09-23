import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateAdminCredentials } from '@/app/lib/auth';
import { adminCookieName, adminSessionMaxAge, createAdminSessionToken } from '@/app/lib/adminSession';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

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