import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Delete the authentication cookie
  cookieStore.delete('ms_admin');

  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}