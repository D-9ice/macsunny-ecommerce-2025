import sharp from 'sharp';
import { del, put } from '@vercel/blob';

// Defense in depth: product images never require HEIF/AVIF decoding.
sharp.block({ operation: ['VipsForeignLoadHeif'] });

const MAX_BYTES = Number(process.env.MACSUNNY_IMAGE_MAX_INPUT_MB || 10) * 1024 * 1024;
const MAX_SIDE = Number(process.env.MACSUNNY_IMAGE_MAX_LONG_SIDE_PX || 1600);
const QUALITY = Number(process.env.MACSUNNY_IMAGE_WEBP_QUALITY || 80);

export async function convertToWebp(file: File) {
  if (!file.size || file.size > MAX_BYTES) throw new Error(`Image must be smaller than ${Math.round(MAX_BYTES / 1024 / 1024)} MB`);
  const input = Buffer.from(await file.arrayBuffer());
  let metadata;
  try { metadata = await sharp(input, { animated: false, limitInputPixels: 40_000_000 }).metadata(); }
  catch { throw new Error('The uploaded file is not a supported image'); }
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported image format. Use JPG, PNG, or WebP.');
  const output = await sharp(input, { animated: false, limitInputPixels: 40_000_000 }).rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 }).toBuffer({ resolveWithObject: true });
  if (output.info.format !== 'webp') throw new Error('WebP conversion failed');
  return { buffer: output.data, width: output.info.width, height: output.info.height, bytes: output.info.size };
}

export async function uploadProductWebp(productId: string, file: File) {
  const converted = await convertToWebp(file);
  const environment = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
  const configuredPrefix = process.env.MACSUNNY_BLOB_PREFIX || `${environment}/products`;
  const prefix = configuredPrefix.trim().replace(/\s+/g, '').replace(/^\/+|\/+$/g, '') || `${environment}/products`;
  const token = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  const pathname = `${prefix}/${productId}/${Date.now()}-${token}.webp`;
  const blob = await put(pathname, converted.buffer, { access: 'public', contentType: 'image/webp', addRandomSuffix: false });
  return { ...converted, url: blob.url, pathname: blob.pathname };
}

export async function uploadAnalysisWebp(file: File) {
  const converted = await convertToWebp(file);
  const pathname = `temporary/smart-manager/${Date.now()}-${crypto.randomUUID()}.webp`;
  const blob = await put(pathname, converted.buffer, {
    access: 'public', contentType: 'image/webp', addRandomSuffix: false, cacheControlMaxAge: 60,
  });
  return { ...converted, url: blob.url, pathname: blob.pathname };
}

export async function deleteBlobSafely(pathname?: string | null) {
  if (!pathname) return;
  try { await del(pathname); } catch (error) { console.error('Blob cleanup failed', { pathname, error }); }
}
