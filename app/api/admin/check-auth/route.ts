import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

export async function GET() {
  return NextResponse.json({ authenticated: await isAdminAuthenticated() });
}