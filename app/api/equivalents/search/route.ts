import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import { isNexarConfigured, searchNexarEquivalents } from '@/app/lib/nexar';
import mongoose from 'mongoose';

const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  // Keep legacy values readable while all new external results are stored as Nexar.
  source: { type: String, enum: ['nexar', 'octopart', 'digikey', 'manual'], default: 'manual' },
  cached_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: () => new Date(Date.now() + CACHE_TTL_MS) },
}, { timestamps: true });

EquivalentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const EquivalentModel = mongoose.models.Equivalent ||
  mongoose.model('Equivalent', EquivalentSchema);

async function appendLocalEquivalentMatches(results: any, equivalents: any[], searchTerm: string) {
  for (const equivalent of equivalents) {
    const mpn = String(equivalent.mpn || '').trim();
    if (!mpn) continue;

    const exact = new RegExp(`^${escapeRegex(mpn)}$`, 'i');
    const localMatch = await ProductModel.findOne({
      $or: [
        { sku: exact },
        { mpn: exact },
        { name: { $regex: escapeRegex(mpn), $options: 'i' } },
      ],
    });

    if (localMatch && !results.found_in_inventory.some((product: any) => product.sku === localMatch.sku)) {
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

/**
 * Smart component equivalent search.
 *
 * Strategy:
 * 1. Check MacSunny local inventory first.
 * 2. Check cached equivalents (90-day TTL).
 * 3. On cache miss, query Nexar Supply GraphQL for similar parts.
 * 4. Cache Nexar results for future queries.
 * 5. Check whether any returned equivalents are stocked locally.
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
    if (!searchTerm || searchTerm.length > 120) {
      return NextResponse.json(
        { success: false, error: 'Invalid search query' },
        { status: 400 }
      );
    }

    const safeSearch = escapeRegex(searchTerm);
    const results: any = {
      query: searchTerm,
      found_in_inventory: [],
      cached_equivalents: null,
      external_equivalents: null,
      external_provider: {
        name: 'Nexar',
        configured: isNexarConfigured(),
      },
      strategy: [],
    };

    // STEP 1: MacSunny inventory first.
    results.strategy.push('local_inventory');

    const localProducts = await ProductModel.find({
      $or: [
        { sku: { $regex: safeSearch, $options: 'i' } },
        { mpn: { $regex: safeSearch, $options: 'i' } },
        { name: { $regex: safeSearch, $options: 'i' } },
      ],
    }).limit(10);

    results.found_in_inventory = localProducts.map((product: any) => ({
      sku: product.sku,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      in_stock: true,
      source: 'local',
    }));

    // STEP 2: Cached equivalents.
    results.strategy.push('cache_check');

    const cachedEquiv = await EquivalentModel.findOne({
      primary_sku: { $regex: new RegExp(`^${safeSearch}$`, 'i') },
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
        expires_in_days: Math.max(
          0,
          Math.floor((cachedEquiv.expires_at.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        ),
      };

      await appendLocalEquivalentMatches(results, cachedEquiv.equivalents, searchTerm);
    }

    // STEP 3: Nexar external search only on cache miss.
    if (!cachedEquiv && includeExternal && isNexarConfigured()) {
      results.strategy.push('nexar_api');

      try {
        const equivalents = await searchNexarEquivalents(searchTerm);

        if (equivalents.length > 0) {
          results.external_equivalents = {
            equivalents,
            source: 'nexar',
            count: equivalents.length,
          };

          // STEP 4: Cache Nexar results.
          results.strategy.push('cache_save');

          await EquivalentModel.findOneAndUpdate(
            { primary_sku: searchTerm },
            {
              primary_sku: searchTerm,
              primary_name: equivalents[0]?.description || searchTerm,
              equivalents: equivalents.map((equivalent) => ({
                mpn: equivalent.mpn,
                manufacturer: equivalent.manufacturer,
                description: equivalent.description,
                specs: equivalent.specs,
                in_stock_external: equivalent.in_stock_external,
                distributor: equivalent.distributor,
                compatibility: 1.0,
              })),
              source: 'nexar',
              cached_at: new Date(),
              expires_at: new Date(Date.now() + CACHE_TTL_MS),
            },
            { upsert: true, new: true }
          );

          // STEP 5: Surface equivalents already sold by MacSunny.
          await appendLocalEquivalentMatches(results, equivalents, searchTerm);
        }
      } catch (error: any) {
        console.error('Nexar equivalent search failed:', error);
        results.external_error = error?.message || 'Nexar external search failed';
      }
    }

    const summary = {
      total_results: results.found_in_inventory.length,
      has_local_stock: results.found_in_inventory.length > 0,
      has_cached_data: Boolean(results.cached_equivalents),
      has_external_data: Boolean(results.external_equivalents),
      cache_used: Boolean(results.cached_equivalents),
      api_called: results.strategy.includes('nexar_api'),
      external_configured: isNexarConfigured(),
      external_provider: 'nexar',
    };

    return NextResponse.json({
      success: true,
      ...results,
      summary,
    });
  } catch (error: any) {
    console.error('Equivalent search error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Equivalent search failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    info: 'POST with { "query": "COMPONENT_SKU" } to search for equivalents',
    provider: 'nexar',
    nexar_configured: isNexarConfigured(),
  });
}
