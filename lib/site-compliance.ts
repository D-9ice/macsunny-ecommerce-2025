import crypto from 'crypto';
import { cookies } from 'next/headers';
import { connectDB, ComplianceAuditModel, ComplianceStateModel } from '@/app/lib/mongodb';

export type GuardMode = 'ACTIVE' | 'WARNING' | 'SERVICE_LOCKED';
export const OWNER_COOKIE = 'ms_owner_guard';

function secret() { return process.env.MACSUNNY_GUARD_SECRET || ''; }
export function ownerToken() { return crypto.createHmac('sha256', secret()).update('macsunny-owner-console-v1').digest('hex'); }
export async function isOwner() {
  const value = (await cookies()).get(OWNER_COOKIE)?.value || '';
  const expected = ownerToken();
  if (!secret() || value.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
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
