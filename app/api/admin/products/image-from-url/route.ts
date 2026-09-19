import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import { deleteBlobSafely, uploadProductWebp } from '@/lib/images';

export const runtime = 'nodejs';

function privateAddress(address: string) {
  if (address === '::1' || address === '0.0.0.0' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

async function downloadImage(rawUrl: string, sourceUrl = '') {
  let url = new URL(rawUrl);
  let response: Response | null = null;
  for (let redirects = 0; redirects < 4; redirects += 1) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid image URL');
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error('Image host is not allowed');
    response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12_000), headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0 (compatible; MacSunny/1.0)', ...(sourceUrl ? { Referer: sourceUrl } : {}) } });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location) throw new Error('The selected image redirect is invalid');
    url = new URL(location, url);
  }
  if (!response) throw new Error('The selected image could not be downloaded');
  if (!response.ok) throw new Error('The selected image could not be downloaded');
  const type = (response.headers.get('content-type') || '').split(';')[0];
  if (!type.startsWith('image/')) throw new Error('The selected URL is not an image');
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > 10 * 1024 * 1024) throw new Error('The selected image is too large');
  const data = await response.arrayBuffer();
  if (!data.byteLength || data.byteLength > 10 * 1024 * 1024) throw new Error('The selected image is too large');
  return new File([data], `component.${type.split('/')[1] || 'jpg'}`, { type });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if ((await cookies()).get('ms_admin')?.value !== '1') return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  let newlyUploaded: string | null = null;
  try {
    const { sku, url, fallbackUrl, sourceUrl, alt } = await request.json();
    if (!sku || !url) return NextResponse.json({ success: false, message: 'SKU and image URL are required', requestId }, { status: 400 });
    await connectDB();
    const product = await ProductModel.findOne({ sku: String(sku).trim() }).select('+imageStorageKey');
    if (!product) return NextResponse.json({ success: false, message: 'Product not found', requestId }, { status: 404 });
    let file: File;
    try { file = await downloadImage(String(url), String(sourceUrl || '')); }
    catch (primaryError) {
      if (!fallbackUrl || fallbackUrl === url) throw primaryError;
      file = await downloadImage(String(fallbackUrl), String(sourceUrl || ''));
    }
    const uploaded = await uploadProductWebp(String(product._id), file);
    newlyUploaded = uploaded.pathname;
    const oldPath = product.imageStorageKey;
    product.set({ imageUrl: uploaded.url, imageAlt: String(alt || product.name).slice(0, 180), imageStorageKey: uploaded.pathname, imageFormat: 'webp', imageMimeType: 'image/webp', imageWidth: uploaded.width, imageHeight: uploaded.height, imageBytes: uploaded.bytes, imageUpdatedAt: new Date(), imageSourceUrl: String(url).slice(0, 2000) });
    await product.save(); newlyUploaded = null; await deleteBlobSafely(oldPath);
    return NextResponse.json({ success: true, imageUrl: uploaded.url, requestId });
  } catch (error) {
    await deleteBlobSafely(newlyUploaded);
    console.error('product.remote-image.failed', { requestId, error });
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Image import failed', requestId }, { status: 422 });
  }
}
