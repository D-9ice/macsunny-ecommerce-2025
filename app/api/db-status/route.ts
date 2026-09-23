import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import os from 'os';
import { connectDB, ProductModel, OrderModel, CategoryModel } from '@/app/lib/mongodb';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  try {
    // Try connecting to MongoDB (safe re-use if already connected)
    await connectDB();

    const state = mongoose.connection.readyState;
    const status =
      state === 1
        ? 'connected'
        : state === 2
        ? 'connecting'
        : 'disconnected';

    if (status !== 'connected') {
      return NextResponse.json({ status });
    }

    // Count records in key collections
    const [products, orders, categories] = await Promise.all([
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      CategoryModel.countDocuments(),
    ]);

    // System info
    const memBytes = process.memoryUsage().heapUsed;
    const dbUptimeSec = process.uptime();
    const memoryUsage = `${(memBytes / 1024 / 1024).toFixed(1)} MB`;
    const dbUptime = `${Math.floor(dbUptimeSec / 60)}m ${Math.floor(dbUptimeSec % 60)}s`;

    return NextResponse.json({
      status,
      products,
      orders,
      categories,
      environment: process.env.NODE_ENV || 'unknown',
      memoryUsage,
      dbUptime,
      memBytes,
      dbUptimeSec,
    });
  } catch (error) {
    console.error('db.status.failed', { error });
    return NextResponse.json(
      { status: 'disconnected', message: 'Database status is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
