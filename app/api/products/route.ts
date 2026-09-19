import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import { deleteBlobSafely } from '@/lib/images';

const projection = 'sku name category price imageUrl imageAlt description quantity manufacturer mpn package pinCount datasheetUrl specifications verificationSources verificationConfidence verificationStatus imageSourceUrl createdAt updatedAt';
const isAdmin = async () => (await cookies()).get('ms_admin')?.value === '1';
const safeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const publicProduct = (item: Record<string, unknown>) => ({ ...item, image: item.imageUrl || null });
const safeUrl = (value: unknown) => { try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; } };
const safeSpecs = (value: unknown) => Array.isArray(value) ? value.slice(0, 8).map((item) => ({ label: String(item?.label || '').slice(0, 80), value: String(item?.value || '').slice(0, 180) })).filter((item) => item.label && item.value) : [];
const safeSources = (value: unknown) => Array.isArray(value) ? value.slice(0, 8).map((item) => ({ title: String(item?.title || '').slice(0, 180), url: safeUrl(item?.url), kind: String(item?.kind || 'other').slice(0, 40) })).filter((item) => item.url) : [];

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') || '24', 10) || 24));
    const search = (params.get('search') || params.get('q') || '').trim().slice(0, 100);
    const category = (params.get('category') || '').trim().slice(0, 100);
    const sortName = params.get('sort') || 'latest';
    const query: Record<string, unknown> = {};
    if (search) {
      const pattern = new RegExp(safeRegex(search), 'i');
      query.$or = [{ name: pattern }, { category: pattern }, { sku: pattern }, { description: pattern }];
    }
    if (category) query.category = category;
    const sort: Record<string, 1 | -1> = sortName === 'price-asc' ? { price: 1 } : sortName === 'price-desc' ? { price: -1 } : { createdAt: -1 };
    const [raw, total] = await Promise.all([
      ProductModel.find(query).select(projection).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(query),
    ]);
    const products = raw.map((item) => publicProduct(item as Record<string, unknown>));
    return NextResponse.json({ success: true, data: products, products, items: products, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }, requestId });
  } catch (error) {
    console.error('products.list.failed', { requestId, error });
    return NextResponse.json({ success: false, message: 'Products could not be loaded right now.', requestId }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const body = await request.json();
    const { sku, name, category, price, description = '', quantity = 0 } = body;
    if (!sku?.trim() || !name?.trim() || !category?.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) return NextResponse.json({ success: false, message: 'A positive admin-entered price and all required product fields are required' }, { status: 400 });
    const product = await ProductModel.create({
      sku: sku.trim(), name: name.trim(), category: category.trim(), price: Number(price),
      description: String(description).slice(0, 2000), quantity: Number(quantity) || 0,
      manufacturer: String(body.manufacturer || '').slice(0, 120), mpn: String(body.mpn || '').slice(0, 120),
      package: String(body.package || '').slice(0, 120), pinCount: String(body.pinCount || '').slice(0, 40),
      datasheetUrl: safeUrl(body.datasheetUrl), specifications: safeSpecs(body.specifications),
      verificationSources: safeSources(body.verificationSources),
      verificationConfidence: Number.isFinite(Number(body.verificationConfidence)) ? Math.max(0, Math.min(100, Number(body.verificationConfidence))) : null,
      verificationStatus: body.verificationStatus === 'verified' ? 'verified' : 'needs-review', imageSourceUrl: safeUrl(body.imageSourceUrl),
    });
    return NextResponse.json({ success: true, product: publicProduct(product.toObject()) }, { status: 201 });
  } catch (error) {
    const duplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
    return NextResponse.json({ success: false, message: duplicate ? 'Product with this SKU already exists' : 'Failed to create product' }, { status: duplicate ? 409 : 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await request.json();
  if (!body.sku || !Number.isFinite(Number(body.price)) || Number(body.price) <= 0) return NextResponse.json({ success: false, message: 'SKU and a positive admin-entered price are required' }, { status: 400 });
  const update: Record<string, unknown> = { name: body.name, category: body.category, price: Number(body.price), description: body.description || '', quantity: Number(body.quantity) || 0 };
  if ('manufacturer' in body) update.manufacturer = String(body.manufacturer || '').slice(0, 120);
  if ('mpn' in body) update.mpn = String(body.mpn || '').slice(0, 120);
  if ('package' in body) update.package = String(body.package || '').slice(0, 120);
  if ('pinCount' in body) update.pinCount = String(body.pinCount || '').slice(0, 40);
  if ('datasheetUrl' in body) update.datasheetUrl = safeUrl(body.datasheetUrl);
  if ('specifications' in body) update.specifications = safeSpecs(body.specifications);
  if ('verificationSources' in body) update.verificationSources = safeSources(body.verificationSources);
  if ('verificationConfidence' in body) update.verificationConfidence = Number.isFinite(Number(body.verificationConfidence)) ? Math.max(0, Math.min(100, Number(body.verificationConfidence))) : null;
  if ('verificationStatus' in body) update.verificationStatus = body.verificationStatus === 'verified' ? 'verified' : 'needs-review';
  if ('imageSourceUrl' in body) update.imageSourceUrl = safeUrl(body.imageSourceUrl);
  const product = await ProductModel.findOneAndUpdate({ sku: body.sku }, update, { new: true, runValidators: true }).select(projection).lean();
  if (!product) return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
  return NextResponse.json({ success: true, product: publicProduct(product as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const sku = new URL(request.url).searchParams.get('sku');
  if (!sku) return NextResponse.json({ success: false, message: 'SKU is required' }, { status: 400 });
  const product = await ProductModel.findOneAndDelete({ sku }).select('+imageStorageKey').lean();
  if (!product) return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
  await deleteBlobSafely((product as unknown as { imageStorageKey?: string }).imageStorageKey);
  return NextResponse.json({ success: true });
}
