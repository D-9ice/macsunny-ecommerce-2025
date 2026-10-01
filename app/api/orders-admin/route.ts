import { NextResponse } from 'next/server';
import { connectDB, OrderModel } from '@/app/lib/mongodb';
import { isAdminRequestAuthenticated } from '@/app/lib/adminAuth';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeOrder(order: any) {
  return {
    ...order,
    _id: order._id?.toString?.() ?? String(order._id || ''),
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          ...item,
          _id: item?._id?.toString?.() ?? (item?._id ? String(item._id) : undefined),
        }))
      : [],
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
    updatedAt: order.updatedAt?.toISOString?.() ?? order.updatedAt,
  };
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

async function authorized(request: Request) {
  return isAdminRequestAuthenticated(request);
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return json({ success: false, message: 'Admin session expired. Please sign in again.' }, 401);
  }

  try {
    await connectDB();
    const orders = await OrderModel.find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return json({
      success: true,
      count: orders.length,
      orders: orders.map(normalizeOrder),
    });
  } catch (error) {
    console.error('orders.admin.fetch.failed', error);
    return json({ success: false, message: 'Failed to fetch orders' }, 500);
  }
}

export async function PUT(request: Request) {
  if (!(await authorized(request))) {
    return json({ success: false, message: 'Admin session expired. Please sign in again.' }, 401);
  }
  if (!sameOrigin(request)) {
    return json({ success: false, message: 'Unexpected request origin.' }, 403);
  }
  if (!rateAllowed(request, 'admin-orders-write', 40, 5 * 60_000)) {
    return json({ success: false, message: 'Too many order update requests.' }, 429);
  }

  try {
    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed.ok) {
      return json({ success: false, message: parsed.message }, parsed.status);
    }

    const orderId = String(parsed.value?.orderId || '').trim();
    const status = String(parsed.value?.status || '').trim();
    const allowedStatuses = new Set(['pending', 'processing', 'completed', 'cancelled']);

    if (!orderId || !allowedStatuses.has(status)) {
      return json({ success: false, message: 'A valid order ID and status are required' }, 400);
    }

    await connectDB();
    const order = await OrderModel.findOneAndUpdate(
      { orderId },
      { status },
      { new: true },
    ).lean().exec();

    if (!order) {
      return json({ success: false, message: 'Order not found' }, 404);
    }

    return json({ success: true, order: normalizeOrder(order) });
  } catch (error) {
    console.error('orders.admin.update.failed', error);
    return json({ success: false, message: 'Failed to update order' }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized(request))) {
    return json({ success: false, message: 'Admin session expired. Please sign in again.' }, 401);
  }
  if (!sameOrigin(request)) {
    return json({ success: false, message: 'Unexpected request origin.' }, 403);
  }
  if (!rateAllowed(request, 'admin-orders-delete', 10, 10 * 60_000)) {
    return json({ success: false, message: 'Too many order deletion requests.' }, 429);
  }

  try {
    await connectDB();
    const result = await OrderModel.deleteMany({
      status: { $in: ['completed', 'cancelled'] },
    });

    return json({
      success: true,
      message: `Deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('orders.admin.delete.failed', error);
    return json({ success: false, message: 'Failed to delete orders' }, 500);
  }
}
