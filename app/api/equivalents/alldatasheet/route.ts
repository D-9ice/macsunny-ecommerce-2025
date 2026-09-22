import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { allDatasheetReferenceUrl, isAllDatasheetConfigured } from '@/app/lib/alldatasheet';

export async function GET() {
  if ((await cookies()).get('ms_admin')?.value !== '1') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    configured: isAllDatasheetConfigured(),
    provider: 'AllDatasheet',
    direct_reference_available: true,
    direct_reference_example: allDatasheetReferenceUrl('TIP41'),
    public_lookup_enabled: process.env.ALLDATASHEET_PUBLIC_LOOKUP_ENABLED === 'true',
  });
}
