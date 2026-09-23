import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isNexarConfigured } from '@/app/lib/nexar';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    configured: isNexarConfigured(),
    provider: 'Nexar Supply GraphQL API',
    auth: 'OAuth 2.0 Client Credentials',
    scope: 'supply.domain',
    required_environment_variables: [
      'NEXAR_CLIENT_ID',
      'NEXAR_CLIENT_SECRET',
    ],
    public_lookup_enabled: process.env.NEXAR_PUBLIC_LOOKUP_ENABLED === 'true',
    optional_environment_variables: [
      'NEXAR_PUBLIC_LOOKUP_ENABLED',
    ],
  });
}
