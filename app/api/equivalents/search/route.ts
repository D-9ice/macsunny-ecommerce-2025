import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import mongoose from 'mongoose';

// Import the Equivalent model schema
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
    compatibility: { type: Number, default: 1.0 },
    notes: String,
  }],
  source: { type: String, enum: ['octopart', 'digikey', 'manual'], default: 'manual' },
  cached_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
}, { timestamps: true });

EquivalentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const EquivalentModel = mongoose.models.Equivalent || 
  mongoose.model('Equivalent', EquivalentSchema);

/**
 * Smart Component Equivalent Search with Caching
 * 
 * Strategy:
 * 1. Check MacSunny local inventory first
 * 2. Check cached equivalents (90-day TTL)
 * 3. If cache miss, query Octopart API
 * 4. Cache Octopart results for future queries
 * 5. Check MacSunny inventory for any found equivalents
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { query, includeExternal = true } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Search query required' },
        { status: 400 }
      );
    }

    const searchTerm = query.trim().toUpperCase();
    const results: any = {
      query: searchTerm,
      found_in_inventory: [],
      cached_equivalents: null,
      external_equivalents: null,
      strategy: [],
    };

    // ===== STEP 1: Check MacSunny Local Inventory =====
    console.log(`📦 Step 1: Checking local inventory for "${searchTerm}"`);
    results.strategy.push('local_inventory');

    const localProducts = await ProductModel.find({
      $or: [
        { sku: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } },
      ]
    }).limit(10);

    results.found_in_inventory = localProducts.map((p: any) => ({
      sku: p.sku,
      name: p.name,
      price: p.price,
      category: p.category,
      image: p.image,
      in_stock: true,
      source: 'local',
    }));

    if (localProducts.length > 0) {
      console.log(`✅ Found ${localProducts.length} match(es) in local inventory`);
    }

    // ===== STEP 2: Check Cached Equivalents =====
    console.log(`💾 Step 2: Checking cached equivalents for "${searchTerm}"`);
    results.strategy.push('cache_check');

    const cachedEquiv = await EquivalentModel.findOne({
      primary_sku: { $regex: new RegExp(`^${searchTerm}$`, 'i') },
      expires_at: { $gt: new Date() },
    });

    if (cachedEquiv) {
      const cacheAgeDays = Math.floor(
        (Date.now() - cachedEquiv.cached_at.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      results.cached_equivalents = {
        equivalents: cachedEquiv.equivalents,
        source: cachedEquiv.source,
        cached_at: cachedEquiv.cached_at,
        cache_age_days: cacheAgeDays,
        expires_in_days: Math.floor(
          (cachedEquiv.expires_at.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        ),
      };

      console.log(`✅ Found cached equivalents (${cacheAgeDays} days old, ${cachedEquiv.equivalents.length} items)`);

      // Check if any cached equivalents exist in local inventory
      for (const equiv of cachedEquiv.equivalents) {
        const localMatch = await ProductModel.findOne({
          $or: [
            { sku: { $regex: new RegExp(`^${equiv.mpn}$`, 'i') } },
            { name: { $regex: equiv.mpn, $options: 'i' } },
          ]
        });

        if (localMatch && !results.found_in_inventory.some((p: any) => p.sku === localMatch.sku)) {
          results.found_in_inventory.push({
            sku: localMatch.sku,
            name: localMatch.name,
            price: localMatch.price,
            category: localMatch.category,
            image: localMatch.image,
            in_stock: true,
            source: 'local',
            equivalent_of: searchTerm,
          });
        }
      }
    }

    // ===== STEP 3: External Search (Octopart) =====
    // Only if no cache found AND external search enabled
    if (!cachedEquiv && includeExternal && process.env.OCTOPART_API_KEY) {
      console.log(`🌐 Step 3: Querying Octopart API for "${searchTerm}"`);
      results.strategy.push('octopart_api');

      try {
        const octopartUrl = new URL('/api/equivalents/octopart', request.url);
        const octopartResponse = await fetch(octopartUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partNumber: searchTerm }),
        });

        if (octopartResponse.ok) {
          const octopartData = await octopartResponse.json();

          if (octopartData.success && octopartData.equivalents.length > 0) {
            results.external_equivalents = {
              equivalents: octopartData.equivalents,
              source: 'octopart',
              count: octopartData.count,
            };

            console.log(`✅ Octopart returned ${octopartData.count} equivalent(s)`);

            // ===== STEP 4: Cache Octopart Results =====
            console.log(`💾 Step 4: Caching Octopart results for "${searchTerm}"`);
            results.strategy.push('cache_save');

            await EquivalentModel.findOneAndUpdate(
              { primary_sku: searchTerm },
              {
                primary_sku: searchTerm,
                primary_name: octopartData.equivalents[0]?.description || searchTerm,
                equivalents: octopartData.equivalents.map((eq: any) => ({
                  mpn: eq.mpn,
                  manufacturer: eq.manufacturer,
                  description: eq.description,
                  specs: eq.specs,
                  in_stock_external: eq.in_stock_external,
                  distributor: eq.distributor,
                  compatibility: 1.0,
                })),
                source: 'octopart',
                cached_at: new Date(),
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              },
              { upsert: true, new: true }
            );

            console.log(`✅ Cached ${octopartData.count} equivalents for future queries`);

            // ===== STEP 5: Check if equivalents exist in local inventory =====
            for (const equiv of octopartData.equivalents) {
              const localMatch = await ProductModel.findOne({
                $or: [
                  { sku: { $regex: new RegExp(`^${equiv.mpn}$`, 'i') } },
                  { name: { $regex: equiv.mpn, $options: 'i' } },
                ]
              });

              if (localMatch && !results.found_in_inventory.some((p: any) => p.sku === localMatch.sku)) {
                results.found_in_inventory.push({
                  sku: localMatch.sku,
                  name: localMatch.name,
                  price: localMatch.price,
                  category: localMatch.category,
                  image: localMatch.image,
                  in_stock: true,
                  source: 'local',
                  equivalent_of: searchTerm,
                });
              }
            }
          } else {
            console.log(`⚠️ Octopart found no equivalents for "${searchTerm}"`);
          }
        }
      } catch (octopartError: any) {
        console.error('Octopart API error:', octopartError);
        results.external_error = octopartError.message;
      }
    }

    // ===== Build Response Summary =====
    const summary = {
      total_results: results.found_in_inventory.length,
      has_local_stock: results.found_in_inventory.length > 0,
      has_cached_data: !!results.cached_equivalents,
      has_external_data: !!results.external_equivalents,
      cache_used: results.strategy.includes('cache_check') && !!results.cached_equivalents,
      api_called: results.strategy.includes('octopart_api'),
    };

    console.log(`📊 Search complete: ${summary.total_results} local matches, cache=${summary.cache_used}, api=${summary.api_called}`);

    return NextResponse.json({
      success: true,
      ...results,
      summary,
    });

  } catch (error: any) {
    console.error('Equivalent search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    info: 'POST to this endpoint with { "query": "COMPONENT_SKU" } to search for equivalents',
    octopart_configured: !!process.env.OCTOPART_API_KEY,
  });
}
