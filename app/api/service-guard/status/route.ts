import { NextResponse } from 'next/server';
import { getGuardState } from '@/lib/site-compliance';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json({ success: true, ...(await getGuardState()) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { console.error('compliance.status.failed', error); return NextResponse.json({ success: false, mode: 'ACTIVE' }, { status: 503 }); }
}
