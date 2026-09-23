import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { connectDB, MaintenanceStateModel } from '@/app/lib/mongodb';
import { maintenanceSyncConfigured, sendMaintenanceEventToFrontier } from '@/app/lib/maintenanceSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get('ms_admin')?.value === '1';
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\0/g, '').trim().slice(0, max) : '';
}

function scheduleStatus(nextDueAt: Date | string | null | undefined) {
  if (!nextDueAt) return { code: 'setup_required', label: 'Schedule setup required', daysUntil: null };
  const date = new Date(nextDueAt);
  if (Number.isNaN(date.getTime())) return { code: 'setup_required', label: 'Schedule setup required', daysUntil: null };
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.ceil((due - today) / 86_400_000);
  if (days < 0) return { code: 'overdue', label: `Maintenance overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`, daysUntil: days };
  if (days === 0) return { code: 'due', label: 'Quarterly maintenance due today', daysUntil: 0 };
  if (days <= 7) return { code: 'urgent', label: `Maintenance due in ${days} day${days === 1 ? '' : 's'}`, daysUntil: days };
  if (days <= 30) return { code: 'approaching', label: `Maintenance due in ${days} days`, daysUntil: days };
  return { code: 'current', label: `Maintenance current — ${days} days until next service`, daysUntil: days };
}

async function loadState() {
  await connectDB();
  const state = await MaintenanceStateModel.findOneAndUpdate(
    { singletonKey: 'site' },
    {
      $setOnInsert: {
        singletonKey: 'site',
        clientId: 'macsunny',
        provider: 'Frontier DevConsults',
        intervalMonths: 3,
        notices: [],
        records: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean() as any;

  const notices = Array.isArray(state?.notices)
    ? [...state.notices].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : [];
  const records = Array.isArray(state?.records)
    ? [...state.records].sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    : [];

  return {
    provider: state?.provider || 'Frontier DevConsults',
    intervalMonths: 3,
    lastServiceAt: state?.lastServiceAt || null,
    nextDueAt: state?.nextDueAt || null,
    schedule: scheduleStatus(state?.nextDueAt),
    notices,
    records,
    openNoticeCount: notices.filter((notice: any) => notice.status === 'open').length,
    syncConfigured: maintenanceSyncConfigured(),
  };
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }
  try {
    return NextResponse.json(
      { success: true, maintenance: await loadState() },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('maintenance.state.read.failed', { error });
    return NextResponse.json({ success: false, message: 'Maintenance status is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) {
      return NextResponse.json({ success: false, message: 'Request is too large.' }, { status: 413 });
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
  }

  const action = cleanText(body.action, 80);
  await connectDB();

  if (action === 'acknowledge_notice') {
    const id = cleanText(body.id, 120);
    if (!id) return NextResponse.json({ success: false, message: 'Notice ID is required.' }, { status: 400 });

    const now = new Date();
    const updated = await MaintenanceStateModel.findOneAndUpdate(
      { singletonKey: 'site', 'notices.id': id, 'notices.direction': 'frontier_to_macsunny' },
      { $set: { 'notices.$.status': 'acknowledged', 'notices.$.acknowledgedAt': now } },
      { new: true },
    );
    if (!updated) return NextResponse.json({ success: false, message: 'Maintenance notice not found.' }, { status: 404 });

    const sync = await sendMaintenanceEventToFrontier({
      type: 'notice_acknowledged',
      id,
      acknowledgedAt: now.toISOString(),
    });
    return NextResponse.json({ success: true, sync, maintenance: await loadState() });
  }

  if (action === 'report_issue') {
    const message = cleanText(body.message, 3000);
    const subject = cleanText(body.subject, 180) || 'MacSunny maintenance attention requested';
    const severity = ['info', 'warning', 'critical'].includes(String(body.severity))
      ? String(body.severity)
      : 'warning';
    if (!message) return NextResponse.json({ success: false, message: 'Describe the issue before sending.' }, { status: 400 });

    const id = randomUUID();
    const createdAt = new Date();
    await MaintenanceStateModel.findOneAndUpdate(
      { singletonKey: 'site' },
      {
        $setOnInsert: {
          singletonKey: 'site',
          clientId: 'macsunny',
          provider: 'Frontier DevConsults',
          intervalMonths: 3,
        },
        $push: {
          notices: {
            id,
            direction: 'macsunny_to_frontier',
            severity,
            subject,
            message,
            status: 'open',
            source: 'MacSunny Admin',
            createdAt,
            syncStatus: 'pending',
          },
        },
      },
      { upsert: true },
    );

    const sync = await sendMaintenanceEventToFrontier({
      type: 'client_alert',
      id,
      clientId: 'macsunny',
      severity,
      subject,
      message,
      createdAt: createdAt.toISOString(),
    });

    await MaintenanceStateModel.updateOne(
      { singletonKey: 'site', 'notices.id': id },
      { $set: { 'notices.$.syncStatus': sync.ok ? 'synced' : 'failed' } },
    );

    return NextResponse.json({ success: true, sync, maintenance: await loadState() });
  }

  return NextResponse.json({ success: false, message: 'Unsupported maintenance action.' }, { status: 400 });
}
