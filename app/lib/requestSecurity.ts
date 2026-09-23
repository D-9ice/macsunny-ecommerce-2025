type RateBucket = { count: number; resetAt: number };

const globalSecurity = globalThis as typeof globalThis & {
  __macsunnyRateBuckets?: Map<string, RateBucket>;
};

const rateBuckets = globalSecurity.__macsunnyRateBuckets ?? new Map<string, RateBucket>();
globalSecurity.__macsunnyRateBuckets = rateBuckets;

export function requestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export function rateAllowed(
  request: Request,
  namespace: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const key = `${namespace}:${requestIp(request)}`;
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;

  if (rateBuckets.size > 5_000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }

  return true;
}

export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: any } | { ok: false; status: number; message: string }> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, message: 'Request is too large.' };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, status: 413, message: 'Request is too large.' };
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, message: 'Invalid JSON request.' };
  }
}
