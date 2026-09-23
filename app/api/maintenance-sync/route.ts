import { NextResponse } from 'next/server';
import {
  MaintenanceStateModel,
  MaintenanceSyncNonceModel,
  connectDB,
} from '@/app/lib/mongodb';
import {
  addCalendarMonths,
  verifyMaintenanceSignature,
} from '@/app/lib/maintenanceSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 32 * 1024;

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\0/g, '').trim().slice(0, max) : '';
}

function validIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const verified = verifyMaintenanceSignature(request, raw, 'frontier');
  if (!verified.ok) {
    return NextResponse.json({ error: 'Unauthorized maintenance event.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  await connectDB();

  try {
    await MaintenanceSyncNonceModel.create({
      nonce: verified.nonce,
      source: 'frontier',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch {
    return NextResponse.json({ error: 'Replay rejected.' }, { status: 409 });
  }

  const type = cleanText(body.type, 80);
  const eventId = cleanText(body.id, 120);
  if (!type || !eventId) {
    return NextResponse.json({ error: 'Missing maintenance event identity.' }, { status: 400 });
  }

  if (type === 'maintenance_notice') {
    const severity = ['info', 'warning', 'critical'].includes(String(body.severity))
      ? String(body.severity)
      : 'warning';
    const subject = cleanText(body.subject, 180);
    const message = cleanText(body.message, 3000);
    const createdAt = validIsoDate(body.createdAt) || new Date();
    if (!subject || !message) {
      return NextResponse.json({ error: 'Invalid maintenance notice.' }, { status: 400 });
    }

    const exists = await MaintenanceStateModel.exists({ singletonKey: 'site', 'notices.id': eventId });
    if (!exists) {
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
              id: eventId,
              direction: 'frontier_to_macsunny',
              severity,
              subject,
              message,
              status: 'open',
              source: 'Frontier DevConsults',
              createdAt,
              syncStatus: 'synced',
            },
          },
        },
        { upsert: true },
      );
    }
    return NextResponse.json({ success: true, duplicate: Boolean(exists) });
  }

  if (type === 'maintenance_schedule') {
    const lastServiceAt = validIsoDate(body.lastServiceAt);
    let nextDueAt = validIsoDate(body.nextDueAt);
    if (!nextDueAt && lastServiceAt) nextDueAt = addCalendarMonths(lastServiceAt, 3);
    await MaintenanceStateModel.findOneAndUpdate(
      { singletonKey: 'site' },
      {
        $set: {
          clientId: 'macsunny',
          provider: 'Frontier DevConsults',
          intervalMonths: 3,
          lastServiceAt,
          nextDueAt,
        },
      },
      { upsert: true },
    );
    return NextResponse.json({ success: true });
  }

  if (type === 'service_completed') {
    const completedAt = validIsoDate(body.completedAt);
    if (!completedAt) {
      return NextResponse.json({ error: 'Invalid service completion date.' }, { status: 400 });
    }
    const expectedNextDue = addCalendarMonths(completedAt, 3);
    const reference = cleanText(body.reference, 120) || eventId;
    const exists = await MaintenanceStateModel.exists({ singletonKey: 'site', 'records.reference': reference });

    if (!exists) {
      await MaintenanceStateModel.findOneAndUpdate(
        { singletonKey: 'site' },
        {
          $set: {
            clientId: 'macsunny',
            provider: 'Frontier DevConsults',
            intervalMonths: 3,
            lastServiceAt: completedAt,
            nextDueAt: expectedNextDue,
          },
          $push: {
            records: {
              reference,
              completedAt,
              summary: cleanText(body.summary, 1500),
              findings: cleanText(body.findings, 3000),
              workPerformed: cleanText(body.workPerformed, 3000),
              recommendations: cleanText(body.recommendations, 3000),
              nextDueAt: expectedNextDue,
              syncedAt: new Date(),
            },
          },
        },
        { upsert: true },
      );
    }
    return NextResponse.json({ success: true, duplicate: Boolean(exists), nextDueAt: expectedNextDue.toISOString() });
  }

  if (type === 'notice_resolved') {
    await MaintenanceStateModel.updateOne(
      { singletonKey: 'site', 'notices.id': eventId },
      {
        $set: {
          'notices.$.status': 'resolved',
          'notices.$.resolvedAt': new Date(),
        },
      },
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unsupported maintenance event.' }, { status: 400 });
}
