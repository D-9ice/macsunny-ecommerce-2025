import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, ProductModel, OrderModel, CategoryModel } from '@/app/lib/mongodb';

export async function GET() {
  try {
    await connectDB();

    const state = mongoose.connection.readyState;
    const status =
      state === 1
        ? 'connected'
        : state === 2
        ? 'connecting'
        : 'disconnected';

    if (status !== 'connected') {
      return NextResponse.json(
        { status },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      );
    }

    const [products, orders, categories] = await Promise.all([
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      CategoryModel.countDocuments(),
    ]);

    const memBytes = process.memoryUsage().heapUsed;
    const dbUptimeSec = process.uptime();

    return NextResponse.json(
      {
        status,
        products,
        orders,
        categories,
        environment: process.env.NODE_ENV || 'unknown',
        memoryUsage: `${(memBytes / 1024 / 1024).toFixed(1)} MB`,
        dbUptime: `${Math.floor(dbUptimeSec / 60)}m ${Math.floor(dbUptimeSec % 60)}s`,
        memBytes,
        dbUptimeSec,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('admin.db.status.failed', { error });
    return NextResponse.json(
      { status: 'disconnected', message: 'Database status is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
