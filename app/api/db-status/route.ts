import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import os from 'os';
import { connectDB, ProductModel, OrderModel, CategoryModel } from '@/app/lib/mongodb';

export async function GET() {
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
    const memoryUsage = `${(
      process.memoryUsage().heapUsed /
      1024 /
      1024
    ).toFixed(1)} MB`;

    const dbUptime = `${Math.floor(process.uptime() / 60)}m ${Math.floor(
      process.uptime() % 60
    )}s`;

    return NextResponse.json({
      status,
      products,
      orders,
      categories,
      environment: process.env.NODE_ENV || 'unknown',
      memoryUsage,
      dbUptime,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch DB status:', error.message);
    return NextResponse.json(
      { status: 'disconnected', message: error.message },
      { status: 500 }
    );
  }
}
