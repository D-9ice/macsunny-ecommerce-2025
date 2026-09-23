import { NextResponse } from 'next/server';
import { connectDB, getMongoDb, OrderModel, ProductModel } from '@/app/lib/mongodb';
import { orderSchema } from '@/app/lib/validations';
import { cookies } from 'next/headers';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

const isAdmin = async () => await isAdminAuthenticated();

const STORE_LATITUDE = 5.6037;
const STORE_LONGITUDE = -0.1870;

const DEFAULT_ZONES = [
  { basePrice: 10, pricePerKm: 2, maxDistance: 15, enabled: true },
  { basePrice: 20, pricePerKm: 3, maxDistance: 50, enabled: true },
  { basePrice: 50, pricePerKm: 5, maxDistance: 300, enabled: true },
  { basePrice: 80, pricePerKm: 7, maxDistance: 500, enabled: true },
];

function radians(value: number) {
  return value * (Math.PI / 180);
}

function distanceKm(latitude: number, longitude: number) {
  const earthRadius = 6371;
  const deltaLat = radians(latitude - STORE_LATITUDE);
  const deltaLon = radians(longitude - STORE_LONGITUDE);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(STORE_LATITUDE)) *
      Math.cos(radians(latitude)) *
      Math.sin(deltaLon / 2) ** 2;
  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function safeNumber(value: unknown, fallback: number, min = 0, max = 1_000_000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

async function deliveryCharge(
  subtotal: number,
  location: { latitude: number; longitude: number },
) {
  const db = await getMongoDb();
  const settings = await db.collection('delivery_settings').findOne({});
  const threshold = safeNumber(settings?.freeDeliveryThreshold, 500);
  if (subtotal >= threshold) return 0;

  const configured = Array.isArray(settings?.zones) ? settings.zones : DEFAULT_ZONES;
  const zones = configured
    .filter((zone: any) => zone?.enabled !== false)
    .map((zone: any) => ({
      basePrice: safeNumber(zone?.basePrice, 0),
      pricePerKm: safeNumber(zone?.pricePerKm, 0),
      maxDistance: safeNumber(zone?.maxDistance, 0, 0, 20_000),
    }))
    .filter((zone: any) => zone.maxDistance > 0);

  const usable = zones.length ? zones : DEFAULT_ZONES;
  const distance = distanceKm(location.latitude, location.longitude);
  const zone = usable.find((entry: any) => distance <= entry.maxDistance) || usable[usable.length - 1];
  return Math.round((zone.basePrice + distance * zone.pricePerKm) * 100) / 100;
}

/**
 * ✅ Utility function: safely converts _id (ObjectId) to string
 * and ensures clean JSON serialization for frontend usage.
 */
function normalizeOrder(order: any) {
  return {
    ...order,
    _id: order._id?.toString(),
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
    updatedAt: order.updatedAt?.toISOString?.() ?? order.updatedAt,
  };
}

/**
 * ✅ GET — Fetch all orders
 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();

    const orders = await OrderModel.find({})
      .sort({ createdAt: -1 })
      .lean(); // Return plain JS objects (faster + serializable)

    const safeOrders = orders.map(normalizeOrder);

    return NextResponse.json({ success: true, orders: safeOrders });
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * ✅ POST — Create new order with Zod validation
 */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
    }
    if (!rateAllowed(request, 'orders', 12, 10 * 60_000)) {
      return NextResponse.json({ success: false, message: 'Too many order attempts. Please wait and try again.' }, { status: 429 });
    }

    const parsed = await readBoundedJson(request, 64 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status });
    }

    const validation = orderSchema.safeParse(parsed.value);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = validation.data;
    if (data.deliveryRequested && !data.deliveryLocation) {
      return NextResponse.json({ success: false, message: 'A delivery location is required.' }, { status: 400 });
    }

    await connectDB();

    const requestedSkus = [...new Set(data.items.map((item) => item.sku))];
    const products = await ProductModel.find({ sku: { $in: requestedSkus } })
      .select('sku name price')
      .lean() as Array<{ sku: string; name: string; price: number }>;
    const productBySku = new Map(products.map((product) => [product.sku, product]));

    if (productBySku.size !== requestedSkus.length) {
      return NextResponse.json(
        { success: false, message: 'One or more cart items are no longer available. Refresh the cart and try again.' },
        { status: 409 },
      );
    }

    const authoritativeItems = data.items.map((item) => {
      const product = productBySku.get(item.sku)!;
      return {
        sku: product.sku,
        name: product.name,
        price: Number(product.price),
        qty: item.qty,
      };
    });

    const subtotal = Math.round(
      authoritativeItems.reduce((sum, item) => sum + item.price * item.qty, 0) * 100,
    ) / 100;

    const delivery = data.deliveryRequested && data.deliveryLocation
      ? await deliveryCharge(subtotal, data.deliveryLocation)
      : 0;

    const total = Math.round((subtotal + delivery) * 100) / 100;
    const orderId = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;

    const order = await OrderModel.create({
      orderId,
      items: authoritativeItems,
      total,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      status: 'pending',
    });

    const safeOrder = normalizeOrder(order.toObject());
    return NextResponse.json({ success: true, order: safeOrder, pricing: { subtotal, delivery, total } });
  } catch (error) {
    console.error('order.create.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    );
  }
}

/**
 * ✅ PUT — Update order status
 */
export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, message: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    const order = await OrderModel.findOneAndUpdate(
      { orderId },
      { status },
      { new: true, lean: true }
    );

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const safeOrder = normalizeOrder(order);

    return NextResponse.json({ success: true, order: safeOrder });
  } catch (error) {
    console.error('❌ Failed to update order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update order' },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE — Delete completed and cancelled orders
 */
export async function DELETE() {
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    
    // Delete all orders with status 'completed' or 'cancelled'
    const result = await OrderModel.deleteMany({
      status: { $in: ['completed', 'cancelled'] }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Failed to delete orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete orders' },
      { status: 500 }
    );
  }
}
