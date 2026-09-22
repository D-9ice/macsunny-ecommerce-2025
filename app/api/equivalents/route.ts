import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { EquivalentModel, EQUIVALENT_CACHE_TTL_MS } from '@/app/lib/equivalents';
import { cookies } from 'next/headers';

const isAdmin = async () => (await cookies()).get('ms_admin')?.value === '1';

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
  if (!(await isAdmin())) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
        primary_description: data.primary_description || data.primary_name || '',
        primary_manufacturer: data.primary_manufacturer || '',
        primary_datasheet_url: data.primary_datasheet_url || '',
        primary_reference_url: data.primary_reference_url || '',
        primary_specs: data.primary_specs || {},
        equivalents: data.equivalents || [],
        source: data.source || 'manual',
        cached_at: new Date(),
        expires_at: new Date(Date.now() + EQUIVALENT_CACHE_TTL_MS),
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
  if (!(await isAdmin())) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
