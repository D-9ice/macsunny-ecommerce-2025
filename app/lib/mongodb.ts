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
      // Vercel may run multiple isolated function instances. Keep each
      // instance's Atlas footprint deliberately small so an M0 cluster
      // cannot be exhausted by multiplying default 100-connection pools.
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
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

export async function getMongoDb() {
  const connection = await connectDB();
  const db = connection.connection.db;
  if (!db) {
    throw new Error('MongoDB database handle is unavailable');
  }
  return db;
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

const ServiceRenewalItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  provider: { type: String, default: '' },
  purpose: { type: String, default: '' },
  billingType: { type: String, default: '' },
  paymentExpectation: { type: String, default: '' },
  status: { type: String, enum: ['active', 'review', 'pending', 'inactive'], default: 'review' },
  nextReviewDate: { type: String, default: '' },
  cost: { type: String, default: '' },
  impact: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { _id: false });

const ServiceRenewalsSchema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'site' },
  services: { type: [ServiceRenewalItemSchema], default: [] },
}, { timestamps: true });

export const ServiceRenewalsModel =
  mongoose.models.ServiceRenewals || mongoose.model('ServiceRenewals', ServiceRenewalsSchema);

const MaintenanceNoticeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  direction: { type: String, enum: ['frontier_to_macsunny', 'macsunny_to_frontier'], required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
  source: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  acknowledgedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced' },
}, { _id: false });

const MaintenanceRecordSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  completedAt: { type: Date, required: true },
  summary: { type: String, default: '' },
  findings: { type: String, default: '' },
  workPerformed: { type: String, default: '' },
  recommendations: { type: String, default: '' },
  nextDueAt: { type: Date, required: true },
  syncedAt: { type: Date, default: Date.now },
}, { _id: false });

const MaintenanceStateSchema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'site' },
  clientId: { type: String, default: 'macsunny' },
  provider: { type: String, default: 'Frontier DevConsults' },
  intervalMonths: { type: Number, default: 3 },
  lastServiceAt: { type: Date, default: null },
  nextDueAt: { type: Date, default: null },
  notices: { type: [MaintenanceNoticeSchema], default: [] },
  records: { type: [MaintenanceRecordSchema], default: [] },
}, { timestamps: true });

export const MaintenanceStateModel =
  mongoose.models.MaintenanceState || mongoose.model('MaintenanceState', MaintenanceStateSchema);

const MaintenanceSyncNonceSchema = new mongoose.Schema({
  nonce: { type: String, unique: true, required: true },
  source: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export const MaintenanceSyncNonceModel =
  mongoose.models.MaintenanceSyncNonce || mongoose.model('MaintenanceSyncNonce', MaintenanceSyncNonceSchema);
