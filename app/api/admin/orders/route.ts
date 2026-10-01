import { NextResponse } from 'next/server';
import { connectDB, OrderModel } from '@/app/lib/mongodb';
import { isAdminRequestAuthenticated } from '@/app/lib/adminAuth';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

function normalizeOrder(order: any) {
  return {
    ...order,
    _id: order._id?.toString(),
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
    updatedAt: order.updatedAt?.toISOString?.() ?? order.updatedAt,
  };
}

function unauthorized() {
  return NextResponse.json(
    { success: false, message: 'Admin session expired. Please sign in again.' },
    { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated(request))) return unauthorized();

  try {
    await connectDB();
    const orders = await OrderModel.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      { success: true, orders: orders.map(normalizeOrder) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('orders.admin.fetch.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminRequestAuthenticated(request))) return unauthorized();
  if (!sameOrigin(request)) {
    return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
  }
  if (!rateAllowed(request, 'admin-orders-write', 40, 5 * 60_000)) {
    return NextResponse.json({ success: false, message: 'Too many order update requests.' }, { status: 429 });
  }

  try {
    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status });
    }

    const { orderId, status } = parsed.value;
    const allowedStatuses = new Set(['pending', 'processing', 'completed', 'cancelled']);

    if (!orderId || !status || !allowedStatuses.has(String(status))) {
      return NextResponse.json(
        { success: false, message: 'A valid order ID and status are required' },
        { status: 400 },
      );
    }

    await connectDB();
    const order = await OrderModel.findOneAndUpdate(
      { orderId },
      { status },
      { new: true, lean: true },
    );

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, order: normalizeOrder(order) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('orders.admin.update.failed', { error });
    return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequestAuthenticated(request))) return unauthorized();
  if (!sameOrigin(request)) {
    return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
  }
  if (!rateAllowed(request, 'admin-orders-delete', 10, 10 * 60_000)) {
    return NextResponse.json({ success: false, message: 'Too many order deletion requests.' }, { status: 429 });
  }

  try {
    await connectDB();
    const result = await OrderModel.deleteMany({
      status: { $in: ['completed', 'cancelled'] },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${result.deletedCount} orders`,
        deletedCount: result.deletedCount,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('orders.admin.delete.failed', { error });
    return NextResponse.json({ success: false, message: 'Failed to delete orders' }, { status: 500 });
  }
}
