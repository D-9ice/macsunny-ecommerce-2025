import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isMouserConfigured } from '@/app/lib/mouser';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    configured: isMouserConfigured(),
    provider: 'Mouser Search API V2',
    endpoint: 'partnumberandmanufacturer',
    public_lookup_enabled: process.env.MOUSER_PUBLIC_LOOKUP_ENABLED === 'true',
  });
}
