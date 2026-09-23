import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminCookieName } from '@/app/lib/adminSession';

export async function POST() {
  const cookieStore = await cookies();
  
  // Delete the authentication cookie
  cookieStore.delete(adminCookieName());

  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}