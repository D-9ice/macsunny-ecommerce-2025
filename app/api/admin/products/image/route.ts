import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import { deleteBlobSafely, uploadProductWebp } from '@/lib/images';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await isAdminAuthenticated())) return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  let newlyUploaded: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get('file');
    const sku = String(form.get('sku') || '').trim();
    if (!(file instanceof File) || !sku) return NextResponse.json({ success: false, message: 'Image and SKU are required', requestId }, { status: 400 });
    await connectDB();
    const existing = await ProductModel.findOne({ sku }).select('+imageStorageKey');
    if (!existing) return NextResponse.json({ success: false, message: 'Product not found', requestId }, { status: 404 });
    const uploaded = await uploadProductWebp(String(existing._id), file);
    newlyUploaded = uploaded.pathname;
    const oldPath = existing.imageStorageKey;
    existing.set({ imageUrl: uploaded.url, imageAlt: String(form.get('alt') || existing.name).slice(0, 180), imageStorageKey: uploaded.pathname, imageFormat: 'webp', imageMimeType: 'image/webp', imageWidth: uploaded.width, imageHeight: uploaded.height, imageBytes: uploaded.bytes, imageUpdatedAt: new Date() });
    await existing.save();
    newlyUploaded = null;
    await deleteBlobSafely(oldPath);
    console.info('product.image.updated', { requestId, sku, pathname: uploaded.pathname });
    return NextResponse.json({ success: true, imageUrl: uploaded.url, requestId });
  } catch (error) {
    await deleteBlobSafely(newlyUploaded);
    const message = error instanceof Error ? error.message : 'Image upload failed';
    console.error('product.image.failed', { requestId, error });
    const status = /unsupported|not a supported/i.test(message) ? 415 : /smaller|pixel/i.test(message) ? 422 : 500;
    return NextResponse.json({ success: false, message, requestId }, { status });
  }
}
