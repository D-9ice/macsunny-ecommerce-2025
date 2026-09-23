import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, ServiceRenewalsModel } from '@/app/lib/mongodb';
import {
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
  DEFAULT_SERVICE_RENEWALS,
  type ServiceRenewalItem,
  type ServiceRenewalStatus,
} from '@/app/lib/serviceRenewals';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set<ServiceRenewalStatus>(['active', 'review', 'pending', 'inactive']);

function cleanText(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function sanitizeService(value: unknown): ServiceRenewalItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = cleanText(item.id, 80);
  const name = cleanText(item.name, 120);
  if (!id || !name) return null;

  const status = allowedStatuses.has(item.status as ServiceRenewalStatus)
    ? item.status as ServiceRenewalStatus
    : 'review';

  return {
    id,
    name,
    provider: cleanText(item.provider, 120),
    purpose: cleanText(item.purpose, 500),
    billingType: cleanText(item.billingType, 120),
    paymentExpectation: cleanText(item.paymentExpectation, 160),
    status,
    nextReviewDate: /^\d{4}-\d{2}-\d{2}$/.test(cleanText(item.nextReviewDate, 10))
      ? cleanText(item.nextReviewDate, 10)
      : '',
    cost: cleanText(item.cost, 120),
    impact: cleanText(item.impact, 500),
    notes: cleanText(item.notes, 1000),
  };
}

async function requireAdmin() {
  const cookieStore = await cookies();
  return await isAdminAuthenticated();
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    await connectDB();
    const doc = await ServiceRenewalsModel.findOne({ singletonKey: 'site' }).lean() as any;
    const saved = Array.isArray(doc?.services)
      ? doc.services.map(sanitizeService).filter(Boolean)
      : [];

    return NextResponse.json(
      {
        success: true,
        services: saved.length ? saved : DEFAULT_SERVICE_RENEWALS,
        usingDefaults: saved.length === 0,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('service.renewals.read.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Services and renewal information is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const services = Array.isArray(body?.services)
      ? body.services.map(sanitizeService).filter(Boolean).slice(0, 50)
      : [];

    if (!services.length) {
      return NextResponse.json(
        { success: false, message: 'At least one service record is required.' },
        { status: 400 },
      );
    }

    const uniqueIds = new Set<string>();
    for (const service of services as ServiceRenewalItem[]) {
      if (uniqueIds.has(service.id)) {
        return NextResponse.json(
          { success: false, message: 'Each service must have a unique identifier.' },
          { status: 400 },
        );
      }
      uniqueIds.add(service.id);
    }

    await connectDB();
    await ServiceRenewalsModel.findOneAndUpdate(
      { singletonKey: 'site' },
      { $set: { services } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json(
      { success: true, services },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('service.renewals.write.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Services and renewal information could not be saved.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
