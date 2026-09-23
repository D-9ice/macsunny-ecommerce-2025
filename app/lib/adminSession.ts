const ADMIN_COOKIE = 'ms_admin';
const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type AdminSessionPayload = {
  v: number;
  iat: number;
  exp: number;
  nonce: string;
};

const encoder = new TextEncoder();

function keyMaterial() {
  const dedicated = process.env.MACSUNNY_ADMIN_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;

  const maintenance = process.env.CLIENT_MAINTENANCE_SYNC_SECRET?.trim();
  const mongo = process.env.MONGODB_URI?.trim();
  if (maintenance && mongo) return `macsunny-admin-v1|${maintenance}|${mongo}`;

  return '';
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function hmacKey() {
  const material = keyMaterial();
  if (!material) return null;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(material),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export function adminSessionConfigured() {
  return Boolean(keyMaterial());
}

export function adminCookieName() {
  return ADMIN_COOKIE;
}

export function adminSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

export async function createAdminSessionToken() {
  const key = await hmacKey();
  if (!key) throw new Error('Admin session signing is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    v: SESSION_VERSION,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const encoded = textToBase64Url(JSON.stringify(payload));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(encoded)));
  return `${encoded}.${bytesToBase64Url(signature)}`;
}

export async function verifyAdminSessionToken(token: string | null | undefined) {
  if (!token || token.length > 2048) return false;
  const key = await hmacKey();
  if (!key) return false;

  const [encoded, signature, ...extra] = token.split('.');
  if (!encoded || !signature || extra.length) return false;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      encoder.encode(encoded),
    );
    if (!valid) return false;

    const payload = JSON.parse(base64UrlToText(encoded)) as Partial<AdminSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    return payload.v === SESSION_VERSION
      && Number.isInteger(payload.iat)
      && Number.isInteger(payload.exp)
      && typeof payload.nonce === 'string'
      && payload.nonce.length >= 16
      && Number(payload.iat) <= now + 60
      && Number(payload.exp) > now
      && Number(payload.exp) - Number(payload.iat) <= SESSION_TTL_SECONDS + 60;
  } catch {
    return false;
  }
}
