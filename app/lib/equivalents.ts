import mongoose from 'mongoose';

export const EQUIVALENT_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const EquivalentSchema = new mongoose.Schema({
  primary_sku: { type: String, required: true, index: true },
  primary_name: String,
  primary_mpn: String,
  primary_description: String,
  primary_manufacturer: String,
  primary_datasheet_url: String,
  primary_reference_url: String,
  primary_specs: mongoose.Schema.Types.Mixed,
  equivalents: [{
    mpn: String,
    manufacturer: String,
    description: String,
    specs: mongoose.Schema.Types.Mixed,
    in_stock_external: Boolean,
    distributor: String,
    compatibility: { type: Number, default: 1.0 },
    notes: String,
  }],
  source: { type: String, enum: ['nexar', 'mouser', 'octopart', 'digikey', 'manual'], default: 'manual' },
  cached_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: () => new Date(Date.now() + EQUIVALENT_CACHE_TTL_MS) },
}, { timestamps: true });

EquivalentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const EquivalentModel =
  mongoose.models.Equivalent || mongoose.model('Equivalent', EquivalentSchema);
