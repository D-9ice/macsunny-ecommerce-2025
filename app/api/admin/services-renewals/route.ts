import { NextResponse } from 'next/server';
import { connectDB, ServiceRenewalsModel } from '@/app/lib/mongodb';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import {
  DEFAULT_SERVICE_RENEWALS,
  type ServiceRenewalItem,
  type ServiceRenewalStatus,
} from '@/app/lib/serviceRenewals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedStatuses = new Set<ServiceRenewalStatus>(['active', 'review', 'pending', 'inactive']);
const DOMAIN_NAME = 'macsunny.com';
const DOMAIN_RDAP_URL = `https://rdap.verisign.com/com/v1/domain/${DOMAIN_NAME}`;

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
  return isAdminAuthenticated();
}

type DomainRegistrySync = {
  ok: boolean;
  checkedAt: string;
  expiresAt?: string;
  registrar?: string;
  message: string;
};

function registrarName(rdap: any) {
  const entities = Array.isArray(rdap?.entities) ? rdap.entities : [];
  const registrar = entities.find((entity: any) =>
    Array.isArray(entity?.roles) && entity.roles.includes('registrar')
  );
  const vcard = registrar?.vcardArray?.[1];
  if (!Array.isArray(vcard)) return '';

  const fn = vcard.find((row: any) => Array.isArray(row) && row[0] === 'fn');
  return typeof fn?.[3] === 'string' ? fn[3].trim() : '';
}

async function syncDomainRegistration(service: ServiceRenewalItem): Promise<{
  service: ServiceRenewalItem;
  sync: DomainRegistrySync;
}> {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(DOMAIN_RDAP_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/rdap+json, application/json',
        'User-Agent': 'MacSunny-Renewal-Monitor/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        service,
        sync: {
          ok: false,
          checkedAt,
          message: `Registry lookup returned HTTP ${response.status}.`,
        },
      };
    }

    const rdap = await response.json();
    const events = Array.isArray(rdap?.events) ? rdap.events : [];
    const expiration = events.find((event: any) => event?.eventAction === 'expiration');
    const expirationDate = typeof expiration?.eventDate === 'string'
      ? new Date(expiration.eventDate)
      : null;

    if (!expirationDate || Number.isNaN(expirationDate.getTime())) {
      return {
        service,
        sync: {
          ok: false,
          checkedAt,
          message: 'Registry record did not expose a valid expiration date.',
        },
      };
    }

    const today = new Date();
    const expiresAt = expirationDate.toISOString();
    const nextReviewDate = expiresAt.slice(0, 10);
    const registrar = registrarName(rdap);
    const isCurrent = expirationDate.getTime() > today.getTime();

    const updated: ServiceRenewalItem = {
      ...service,
      status: isCurrent ? 'active' : 'review',
      nextReviewDate,
      provider:
        registrar && (!service.provider || service.provider === 'Domain registrar')
          ? registrar
          : service.provider,
    };

    return {
      service: updated,
      sync: {
        ok: true,
        checkedAt,
        expiresAt,
        registrar: registrar || undefined,
        message: isCurrent
          ? `Registry confirms ${DOMAIN_NAME} is active through ${nextReviewDate}.`
          : `Registry reports ${DOMAIN_NAME} at or past its expiration date.`,
      },
    };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      service,
      sync: {
        ok: false,
        checkedAt,
        message: aborted
          ? 'Registry lookup timed out; saved renewal data was left unchanged.'
          : 'Registry lookup failed; saved renewal data was left unchanged.',
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    await connectDB();
    const doc = await ServiceRenewalsModel.findOne({ singletonKey: 'site' }).lean() as any;
    const saved = Array.isArray(doc?.services)
      ? doc.services.map(sanitizeService).filter(Boolean) as ServiceRenewalItem[]
      : [];

    let services: ServiceRenewalItem[] = saved.length
      ? saved
      : DEFAULT_SERVICE_RENEWALS.map((item) => ({ ...item }));

    const domainIndex = services.findIndex((service) => service.id === 'domain');
    let domainSync: DomainRegistrySync | null = null;

    if (domainIndex >= 0) {
      const result = await syncDomainRegistration(services[domainIndex]);
      services[domainIndex] = result.service;
      domainSync = result.sync;

      // Persist registry-confirmed renewal data so the dashboard no longer
      // falls back to the original "review / date not set" seed state.
      if (result.sync.ok) {
        await ServiceRenewalsModel.findOneAndUpdate(
          { singletonKey: 'site' },
          { $set: { services } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        services,
        usingDefaults: saved.length === 0,
        domainSync,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
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
