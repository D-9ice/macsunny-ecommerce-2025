import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import mongoose from 'mongoose';

// Schema for caching component equivalents (90-day TTL)
const EquivalentSchema = new mongoose.Schema({
  primary_sku: { type: String, required: true, index: true },
  primary_name: String,
  equivalents: [{
    mpn: String,
    manufacturer: String,
    description: String,
    specs: mongoose.Schema.Types.Mixed,
    in_stock_external: Boolean,
    distributor: String,
    compatibility: { type: Number, default: 1.0 }, // 0.0-1.0
    notes: String,
  }],
  source: { type: String, enum: ['octopart', 'digikey', 'manual'], default: 'manual' },
  cached_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, // 90 days
}, { timestamps: true });

// Create TTL index for auto-deletion after expiry
EquivalentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const EquivalentModel = mongoose.models.Equivalent || 
  mongoose.model('Equivalent', EquivalentSchema);

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (sku) {
      // Find cached equivalent for specific component
      const equiv = await EquivalentModel.findOne({
        primary_sku: { $regex: new RegExp(`^${sku}$`, 'i') },
        expires_at: { $gt: new Date() }, // Only return non-expired cache
      });

      if (equiv) {
        return NextResponse.json({ 
          success: true, 
          equivalent: equiv,
          cached: true,
          cache_age_days: Math.floor((Date.now() - equiv.cached_at.getTime()) / (24 * 60 * 60 * 1000))
        });
      }

      return NextResponse.json({ 
        success: false, 
        message: 'No cached equivalent found. Try external search.',
        cached: false
      });
    }

    // Return all cached equivalents (for admin view)
    const equivalents = await EquivalentModel.find({
      expires_at: { $gt: new Date() }
    })
    .sort({ cached_at: -1 })
    .limit(100);

    return NextResponse.json({ 
      success: true, 
      equivalents,
      count: equivalents.length
    });

  } catch (error: any) {
    console.error('Equivalents GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.primary_sku) {
      return NextResponse.json(
        { success: false, error: 'primary_sku is required' },
        { status: 400 }
      );
    }

    // Upsert (update if exists, create if not)
    const equivalent = await EquivalentModel.findOneAndUpdate(
      { primary_sku: data.primary_sku.toUpperCase() },
      {
        primary_sku: data.primary_sku.toUpperCase(),
        primary_name: data.primary_name,
        equivalents: data.equivalents || [],
        source: data.source || 'manual',
        cached_at: new Date(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, equivalent });

  } catch (error: any) {
    console.error('Equivalents POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (!sku) {
      return NextResponse.json(
        { success: false, error: 'SKU required for deletion' },
        { status: 400 }
      );
    }

    await EquivalentModel.deleteOne({ primary_sku: sku.toUpperCase() });

    return NextResponse.json({ 
      success: true, 
      message: `Deleted equivalents for ${sku}` 
    });

  } catch (error: any) {
    console.error('Equivalents DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
