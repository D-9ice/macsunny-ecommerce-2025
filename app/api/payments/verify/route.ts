import { NextResponse } from 'next/server';
import { connectDB, OrderModel } from '@/app/lib/mongodb';

export const dynamic = 'force-dynamic';

function parseMetadata(value: unknown): any {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = String(body?.orderId || '').trim();
    const reference = String(body?.reference || '').trim();

    if (!orderId || !reference || orderId.length > 120 || reference.length > 200) {
      return NextResponse.json(
        { success: false, message: 'Order ID and payment reference are required.' },
        { status: 400 },
      );
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { success: false, message: 'Payment verification is not configured.' },
        { status: 503 },
      );
    }

    await connectDB();
    const order = await OrderModel.findOne({ orderId }).lean() as any;
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
      },
    );
    const verification = await verifyResponse.json().catch(() => null);
    const data = verification?.data;

    if (!verifyResponse.ok || !verification?.status || !data) {
      return NextResponse.json(
        { success: false, message: 'Paystack could not verify this transaction.' },
        { status: 400 },
      );
    }

    const metadata = parseMetadata(data.metadata);
    const customFields = Array.isArray(metadata?.custom_fields) ? metadata.custom_fields : [];
    const metadataOrderId = String(
      customFields.find((field: any) => field?.variable_name === 'order_id')?.value || '',
    ).trim();

    const expectedAmount = Math.round(Number(order.total || 0) * 100);
    const verified =
      data.status === 'success' &&
      String(data.reference || '') === reference &&
      String(data.currency || '').toUpperCase() === 'GHS' &&
      Number(data.amount) === expectedAmount &&
      metadataOrderId === orderId;

    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'Payment verification did not match this order.' },
        { status: 400 },
      );
    }

    const updated = await OrderModel.findOneAndUpdate(
      { orderId },
      {
        $set: {
          paymentRef: reference,
          paymentStatus: 'success',
          status: 'processing',
        },
      },
      { new: true },
    ).lean() as any;

    return NextResponse.json(
      {
        success: true,
        order: {
          orderId: updated?.orderId,
          paymentRef: updated?.paymentRef,
          paymentStatus: updated?.paymentStatus,
          status: updated?.status,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('payment.verify.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Payment verification failed.' },
      { status: 500 },
    );
  }
}
