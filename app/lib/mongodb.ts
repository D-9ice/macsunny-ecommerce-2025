import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  if (cached.conn) {
    console.log('⚡ MongoDB already connected (cached).');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('⏳ Connecting to MongoDB...');
    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB Connected Successfully');
        return mongoose;
      })
      .catch((err) => {
        console.error('❌ MongoDB Connection Failed:', err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// =====================
// Schema Definitions
// =====================

// Product Schema
const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '/logo.svg' },
  },
  { timestamps: true }
);

// Order Schema
const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    items: [
      {
        sku: String,
        name: String,
        price: Number,
        qty: Number,
      },
    ],
    total: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerEmail: String,
    customerPhone: { type: String, required: true },
    customerAddress: String,
    paymentRef: String,
    paymentStatus: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Category Schema
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// =====================
// Model Exports
// =====================
export const ProductModel =
  mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const OrderModel =
  mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const CategoryModel =
  mongoose.models.Category || mongoose.model('Category', CategorySchema);
