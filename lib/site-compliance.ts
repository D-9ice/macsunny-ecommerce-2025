import crypto from 'crypto';
import { cookies } from 'next/headers';
import { connectDB, ComplianceAuditModel, ComplianceStateModel } from '@/app/lib/mongodb';

export type GuardMode = 'ACTIVE' | 'WARNING' | 'SERVICE_LOCKED';
export const OWNER_COOKIE = 'ms_owner_guard';
const OWNER_SESSION_SECONDS = 60 * 60;

function secret() { return (process.env.MACSUNNY_GUARD_SECRET || '').trim(); }

function signOwnerPayload(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createOwnerToken() {
  if (!secret()) throw new Error('Owner guard secret is not configured');
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    exp: Math.floor(Date.now() / 1000) + OWNER_SESSION_SECONDS,
    nonce: crypto.randomUUID(),
  })).toString('base64url');
  return `${payload}.${signOwnerPayload(payload)}`;
}

export function ownerSessionMaxAge() {
  return OWNER_SESSION_SECONDS;
}

export async function isOwner() {
  const value = (await cookies()).get(OWNER_COOKIE)?.value || '';
  if (!secret() || value.length > 2048) return false;
  const [payload, supplied, ...extra] = value.split('.');
  if (!payload || !supplied || extra.length) return false;

  const expected = signOwnerPayload(payload);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded?.v === 1 &&
      typeof decoded?.nonce === 'string' &&
      decoded.nonce.length >= 16 &&
      Number.isInteger(decoded?.exp) &&
      decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function getGuardState() {
  await connectDB();
  let state = await ComplianceStateModel.findOneAndUpdate({ singletonKey: 'site' }, { $setOnInsert: { mode: 'ACTIVE' } }, { new: true, upsert: true });
  if (state.mode === 'WARNING' && state.warningEndsAt && state.warningEndsAt.getTime() <= Date.now()) {
    state = await ComplianceStateModel.findOneAndUpdate({ singletonKey: 'site', mode: 'WARNING' }, { mode: 'SERVICE_LOCKED' }, { new: true });
    await ComplianceAuditModel.create({ action: 'AUTO_LOCK', success: true, detail: 'Warning countdown expired' });
  }
  return { mode: state.mode as GuardMode, warningStartedAt: state.warningStartedAt?.toISOString() || null, warningEndsAt: state.warningEndsAt?.toISOString() || null, message: state.message || '', updatedAt: state.updatedAt?.toISOString() || null };
}

export async function audit(action: string, success: boolean, request: Request, requestId: string, detail = '') {
  try { await connectDB(); await ComplianceAuditModel.create({ action, success, requestId, detail: detail.slice(0, 500), ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' }); }
  catch (error) { console.error('compliance.audit.failed', { requestId, error }); }
}
