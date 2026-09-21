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
    imageUrl: { type: String, default: null },
    imageAlt: { type: String, default: null },
    imageStorageKey: { type: String, default: null },
    imageFormat: { type: String, enum: ['webp', null], default: null },
    imageMimeType: { type: String, enum: ['image/webp', null], default: null },
    imageWidth: { type: Number, default: null },
    imageHeight: { type: Number, default: null },
    imageBytes: { type: Number, default: null },
    imageUpdatedAt: { type: Date, default: null },
    imageMigrationStatus: { type: String, enum: ['pending', 'migrated', 'failed'], default: null },
    imageMigrationError: { type: String, default: null },
    imageMigratedAt: { type: Date, default: null },
    image: { type: String, select: false },
    description: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    manufacturer: { type: String, default: '' },
    mpn: { type: String, default: '' },
    package: { type: String, default: '' },
    pinCount: { type: String, default: '' },
    datasheetUrl: { type: String, default: '' },
    specifications: [{ label: String, value: String }],
    verificationSources: [{ title: String, url: String, kind: String }],
    verificationConfidence: { type: Number, default: null },
    verificationStatus: { type: String, enum: ['verified', 'needs-review', null], default: null },
    imageSourceUrl: { type: String, default: '' },
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

const ComplianceStateSchema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'site' },
  mode: { type: String, enum: ['ACTIVE', 'WARNING', 'SERVICE_LOCKED'], default: 'ACTIVE' },
  warningStartedAt: { type: Date, default: null },
  warningEndsAt: { type: Date, default: null },
  message: { type: String, default: '' },
  updatedBy: { type: String, default: 'owner' },
}, { timestamps: true });

const ComplianceAuditSchema = new mongoose.Schema({
  action: { type: String, required: true }, success: { type: Boolean, required: true },
  ip: String, requestId: String, detail: String,
}, { timestamps: true });

export const ComplianceStateModel = mongoose.models.ComplianceState || mongoose.model('ComplianceState', ComplianceStateSchema);
export const ComplianceAuditModel = mongoose.models.ComplianceAudit || mongoose.model('ComplianceAudit', ComplianceAuditSchema);

const SiteSettingsSchema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'site' },
  theme: {
    mode: { type: String, enum: ['light', 'dark', 'premium'], default: 'premium' },
    accent: { type: String, default: '#48c982' },
    fontScale: { type: Number, default: 1 },
    container: { type: String, enum: ['narrow', 'normal', 'wide'], default: 'normal' },
    rounded: { type: Boolean, default: true },
  },
}, { timestamps: true });

export const SiteSettingsModel =
  mongoose.models.SiteSettings || mongoose.model('SiteSettings', SiteSettingsSchema);
