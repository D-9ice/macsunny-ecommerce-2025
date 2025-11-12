import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('ms_admin')?.value === '1';

  return NextResponse.json({ authenticated: isAuthenticated });
}