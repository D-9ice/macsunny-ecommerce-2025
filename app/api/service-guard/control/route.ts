import { NextResponse } from 'next/server';
import { ComplianceStateModel, connectDB } from '@/app/lib/mongodb';
import { audit, getGuardState, isOwner } from '@/lib/site-compliance';

export async function GET() {
  if (!(await isOwner())) return NextResponse.json({ success: false }, { status: 401 });
  return NextResponse.json({ success: true, ...(await getGuardState()) });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await isOwner())) { await audit('CONTROL_DENIED', false, request, requestId); return NextResponse.json({ success: false, message: 'Owner authorization required', requestId }, { status: 401 }); }
  const { action, message = '' } = await request.json();
  if (!['activate', 'warn', 'lock'].includes(action)) return NextResponse.json({ success: false, message: 'Invalid action', requestId }, { status: 400 });
  await connectDB();
  const now = new Date();
  const update = action === 'warn'
    ? { mode: 'WARNING', warningStartedAt: now, warningEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), message: String(message).slice(0, 280), updatedBy: 'owner' }
    : { mode: action === 'lock' ? 'SERVICE_LOCKED' : 'ACTIVE', warningStartedAt: null, warningEndsAt: null, message: String(message).slice(0, 280), updatedBy: 'owner' };
  await ComplianceStateModel.findOneAndUpdate({ singletonKey: 'site' }, update, { upsert: true, new: true });
  await audit(action.toUpperCase(), true, request, requestId);
  return NextResponse.json({ success: true, ...(await getGuardState()), requestId });
}
