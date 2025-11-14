import { NextResponse } from 'next/server';
import { connectDB, OrderModel } from '@/app/lib/mongodb';
import { orderSchema } from '@/app/lib/validations';
import { z } from 'zod';

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
    await connectDB();
    const body = await request.json();

    // Validate request body with Zod
    const validation = orderSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          errors: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate unique order ID if not provided
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const order = await OrderModel.create({
      orderId,
      items: data.items,
      total: data.total,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      status: 'pending',
    });

    // Convert _id for frontend use
    const safeOrder = normalizeOrder(order.toObject());

    return NextResponse.json({ success: true, order: safeOrder });
  } catch (error) {
    console.error('❌ Failed to create order:', error);
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
export async function DELETE(request: Request) {
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
