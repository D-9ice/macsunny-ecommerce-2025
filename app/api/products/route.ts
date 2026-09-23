import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, ProductModel, CategoryModel } from '@/app/lib/mongodb';
import { EquivalentModel } from '@/app/lib/equivalents';
import { deleteBlobSafely } from '@/lib/images';

const projection = 'sku name category price imageUrl imageAlt description quantity manufacturer mpn package pinCount datasheetUrl specifications verificationSources verificationConfidence verificationStatus imageSourceUrl createdAt updatedAt';
const isAdmin = async () => (await cookies()).get('ms_admin')?.value === '1';
const safeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const publicProduct = (item: Record<string, unknown>) => ({ ...item, image: item.imageUrl || null });
const safeUrl = (value: unknown) => { try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; } };
const safeSpecs = (value: unknown) => Array.isArray(value) ? value.slice(0, 8).map((item) => ({ label: String(item?.label || '').slice(0, 80), value: String(item?.value || '').slice(0, 180) })).filter((item) => item.label && item.value) : [];
const safeSources = (value: unknown) => Array.isArray(value) ? value.slice(0, 8).map((item) => ({ title: String(item?.title || '').slice(0, 180), url: safeUrl(item?.url), kind: String(item?.kind || 'other').slice(0, 40) })).filter((item) => item.url) : [];
const normalizePartKey = (value: unknown) => String(value || '').trim().toUpperCase();
const specsObjectToList = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([label, specValue]) => ({ label: String(label).slice(0, 80), value: String(specValue || '').slice(0, 180) }))
    .filter((item) => item.label && item.value)
    .slice(0, 8);
};
const firstSpecValue = (specs: Array<{ label: string; value: string }>, patterns: RegExp[]) =>
  specs.find((spec) => patterns.some((pattern) => pattern.test(spec.label)))?.value || '';

function buildEquivalentTechnicalIndex(records: any[]) {
  const index = new Map<string, { description: string; manufacturer: string; specs: Array<{ label: string; value: string }>; alternatives: string[]; datasheetUrl: string }>();

  for (const record of records) {
    const primary = normalizePartKey(record.primary_sku);
    const equivalentMpns = Array.isArray(record.equivalents)
      ? record.equivalents.map((item: any) => String(item?.mpn || '').trim()).filter(Boolean)
      : [];

    if (primary) {
      const primaryTechnical = {
        description: String(record.primary_description || record.primary_name || '').trim(),
        manufacturer: String(record.primary_manufacturer || '').trim(),
        specs: specsObjectToList(record.primary_specs),
        alternatives: equivalentMpns.filter((mpn: string) => normalizePartKey(mpn) !== primary).slice(0, 8),
        datasheetUrl: String(record.primary_datasheet_url || '').trim(),
      };
      index.set(primary, primaryTechnical);

      const canonicalPrimary = normalizePartKey(record.primary_mpn);
      if (canonicalPrimary && canonicalPrimary !== primary) {
        index.set(canonicalPrimary, primaryTechnical);
      }
    }

    for (const equivalent of record.equivalents || []) {
      const key = normalizePartKey(equivalent?.mpn);
      if (!key) continue;
      const alternatives = [record.primary_sku, ...equivalentMpns]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .filter((value, position, all) => normalizePartKey(value) !== key && all.findIndex((item) => normalizePartKey(item) === normalizePartKey(value)) === position)
        .slice(0, 8);
      index.set(key, {
        description: String(equivalent?.description || '').trim(),
        manufacturer: String(equivalent?.manufacturer || '').trim(),
        specs: specsObjectToList(equivalent?.specs),
        alternatives,
        datasheetUrl: '',
      });
    }
  }

  return index;
}

function applyEquivalentTechnicalFallback(item: Record<string, any>, index: Map<string, any>) {
  const match = [item.mpn, item.sku].map(normalizePartKey).filter(Boolean).map((key) => index.get(key)).find(Boolean);
  if (!match) return { ...item, equivalentPartNumbers: [] };

  const existingSpecs = Array.isArray(item.specifications) ? item.specifications.filter((spec: any) => spec?.label && spec?.value) : [];
  const specs = existingSpecs.length ? existingSpecs : match.specs;
  const packageFallback = firstSpecValue(specs, [/package/i, /case/i]);
  const pinFallback = firstSpecValue(specs, [/number of pins/i, /^pins?$/i, /pin count/i]);

  return {
    ...item,
    description: String(item.description || '').trim() || match.description || '',
    manufacturer: String(item.manufacturer || '').trim() || match.manufacturer || '',
    specifications: specs,
    package: String(item.package || '').trim() || packageFallback || '',
    pinCount: String(item.pinCount || '').trim() || pinFallback || '',
    datasheetUrl: String(item.datasheetUrl || '').trim() || match.datasheetUrl || '',
    equivalentPartNumbers: match.alternatives,
  };
}
async function managedCategory(value: unknown) {
  const requested = String(value || '').trim();
  if (!requested) return '';
  const exact = new RegExp(`^${safeRegex(requested)}$`, 'i');
  const category = await CategoryModel.findOne({ name: exact }).select('name').lean() as unknown as { name?: string } | null;
  return String(category?.name || '').trim();
}

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
      query.$or = [{ name: pattern }, { category: pattern }, { sku: pattern }, { mpn: pattern }, { description: pattern }];
    }
    if (category) {
      const normalizedCategory = category.toLowerCase();
      query.category = normalizedCategory === 'transistors' || normalizedCategory === 'transistor'
        ? /transistors?/i
        : new RegExp(`^${safeRegex(category)}$`, 'i');
    }
    const sort: Record<string, 1 | -1> = sortName === 'price-asc' ? { price: 1 } : sortName === 'price-desc' ? { price: -1 } : { createdAt: -1 };
    const [raw, total] = await Promise.all([
      ProductModel.find(query).select(projection).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(query),
    ]);

    const partKeys = [
      ...new Set(
        raw
          .flatMap((item: any) => [normalizePartKey(item.mpn), normalizePartKey(item.sku)])
          .filter(Boolean),
      ),
    ];

    const cacheMatchers = partKeys.flatMap((key) => {
      const exact = new RegExp(`^${safeRegex(key)}$`, 'i');
      return [{ primary_sku: exact }, { 'equivalents.mpn': exact }];
    });

    const equivalentRecords = cacheMatchers.length
      ? await EquivalentModel.find({
          expires_at: { $gt: new Date() },
          $or: cacheMatchers,
        }).lean()
      : [];

    const technicalIndex = buildEquivalentTechnicalIndex(equivalentRecords as any[]);
    const products = raw.map((item: any) =>
      publicProduct(applyEquivalentTechnicalFallback(item, technicalIndex)),
    );
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
    const canonicalCategory = await managedCategory(category);
    if (!canonicalCategory) return NextResponse.json({ success: false, message: 'Select a category created in Category Manager before publishing.' }, { status: 400 });
    const normalizedSku = String(sku).trim();
    const normalizedMpn = String(body.mpn || '').trim();
    if (/^(?:NOT-IDENTIFIED|UNKNOWN|N-A|NOT-APPLICABLE)$/i.test(normalizedSku) || /^(?:not identified|unknown|n\/a|not applicable)$/i.test(normalizedMpn)) return NextResponse.json({ success: false, message: 'Identify the exact product or enter a valid SKU before publishing.' }, { status: 400 });
    const duplicateMatchers: Record<string, unknown>[] = [{ sku: new RegExp(`^${safeRegex(normalizedSku)}$`, 'i') }];
    if (normalizedMpn) duplicateMatchers.push({ mpn: new RegExp(`^${safeRegex(normalizedMpn)}$`, 'i') });
    const existing = await ProductModel.findOne({ $or: duplicateMatchers }).select('sku mpn name').lean() as unknown as { sku: string; mpn?: string; name: string } | null;
    if (existing) return NextResponse.json({ success: false, message: `Duplicate rejected: ${existing.name} (${existing.sku}) is already in inventory.` }, { status: 409 });
    const product = await ProductModel.create({
      sku: normalizedSku, name: name.trim(), category: canonicalCategory, price: Number(price),
      description: String(description).slice(0, 2000), quantity: Number(quantity) || 0,
      manufacturer: String(body.manufacturer || '').slice(0, 120), mpn: normalizedMpn.slice(0, 120),
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

  const originalSku = String(body.originalSku || body.sku || '').trim();
  const nextSku = String(body.sku || '').trim();
  const nextMpn = String(body.mpn || '').trim();

  if (!originalSku || !nextSku || !Number.isFinite(Number(body.price)) || Number(body.price) <= 0) {
    return NextResponse.json({ success: false, message: 'SKU and a positive admin-entered price are required' }, { status: 400 });
  }

  if (/^(?:NOT-IDENTIFIED|UNKNOWN|N-A|NOT-APPLICABLE)$/i.test(nextSku)) {
    return NextResponse.json({ success: false, message: 'Enter a valid SKU before saving.' }, { status: 400 });
  }

  const originalExact = new RegExp('^' + safeRegex(originalSku) + '$', 'i');
  const currentProduct = await ProductModel.findOne({ sku: originalExact })
    .select('_id sku mpn')
    .lean() as unknown as { _id: unknown; sku: string; mpn?: string } | null;

  if (!currentProduct) {
    return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
  }

  const duplicateMatchers: Record<string, unknown>[] = [
    { sku: new RegExp('^' + safeRegex(nextSku) + '$', 'i') },
  ];
  if (nextMpn) {
    duplicateMatchers.push({ mpn: new RegExp('^' + safeRegex(nextMpn) + '$', 'i') });
  }

  const conflict = await ProductModel.findOne({
    _id: { $ne: currentProduct._id },
    $or: duplicateMatchers,
  })
    .select('sku mpn name')
    .lean() as unknown as { sku: string; mpn?: string; name?: string } | null;

  if (conflict) {
    return NextResponse.json(
      {
        success: false,
        message: 'Cannot save: ' + (conflict.name || conflict.sku) + ' already uses that SKU or part number.',
      },
      { status: 409 },
    );
  }

  const canonicalCategory = await managedCategory(body.category);
  if (!canonicalCategory) {
    return NextResponse.json(
      { success: false, message: 'Select a category created in Category Manager.' },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    sku: nextSku,
    name: body.name,
    category: canonicalCategory,
    price: Number(body.price),
    description: body.description || '',
    quantity: Number(body.quantity) || 0,
  };

  if ('manufacturer' in body) update.manufacturer = String(body.manufacturer || '').slice(0, 120);
  if ('mpn' in body) update.mpn = nextMpn.slice(0, 120);
  if ('package' in body) update.package = String(body.package || '').slice(0, 120);
  if ('pinCount' in body) update.pinCount = String(body.pinCount || '').slice(0, 40);
  if ('datasheetUrl' in body) update.datasheetUrl = safeUrl(body.datasheetUrl);
  if ('specifications' in body) update.specifications = safeSpecs(body.specifications);
  if ('verificationSources' in body) update.verificationSources = safeSources(body.verificationSources);
  if ('verificationConfidence' in body) update.verificationConfidence = Number.isFinite(Number(body.verificationConfidence)) ? Math.max(0, Math.min(100, Number(body.verificationConfidence))) : null;
  if ('verificationStatus' in body) update.verificationStatus = body.verificationStatus === 'verified' ? 'verified' : 'needs-review';
  if ('imageSourceUrl' in body) update.imageSourceUrl = safeUrl(body.imageSourceUrl);

  try {
    const product = await ProductModel.findByIdAndUpdate(
      currentProduct._id,
      update,
      { new: true, runValidators: true },
    ).select(projection).lean();

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    if (originalSku.toUpperCase() !== nextSku.toUpperCase()) {
      await EquivalentModel.updateMany(
        { primary_sku: originalExact },
        { $set: { primary_sku: nextSku } },
      );
    }

    return NextResponse.json({
      success: true,
      renamed: originalSku.toUpperCase() !== nextSku.toUpperCase(),
      previousSku: originalSku,
      product: publicProduct(product as Record<string, unknown>),
    });
  } catch (error) {
    const duplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
    return NextResponse.json(
      {
        success: false,
        message: duplicate ? 'Another product already uses that SKU.' : 'Product could not be updated.',
      },
      { status: duplicate ? 409 : 500 },
    );
  }
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
