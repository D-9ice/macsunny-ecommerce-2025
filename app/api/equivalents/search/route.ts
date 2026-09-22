import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import { isNexarConfigured, searchNexarEquivalents } from '@/app/lib/nexar';
import { EquivalentModel, EQUIVALENT_CACHE_TTL_MS } from '@/app/lib/equivalents';
import { cookies } from 'next/headers';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePartKey(value: string) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function lookupAliases(value: string) {
  const compact = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^[ABCDJK]\d+[A-Z0-9-]*$/.test(compact)) return [compact, '2S' + compact];
  return [compact];
}
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
    const adminAuthenticated = (await cookies()).get('ms_admin')?.value === '1';
    const publicExternalEnabled = process.env.NEXAR_PUBLIC_LOOKUP_ENABLED === 'true';
    const externalLookupAllowed =
      isNexarConfigured() && (adminAuthenticated || publicExternalEnabled);

    const results: any = {
      query: searchTerm,
      found_in_inventory: [],
      cached_equivalents: null,
      external_equivalents: null,
      external_provider: {
        name: 'Nexar',
        configured: isNexarConfigured(),
        public_lookup_enabled: publicExternalEnabled,
        lookup_allowed: externalLookupAllowed,
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
      mpn: product.mpn || '',
      name: product.name,
      price: product.price,
      quantity: product.quantity || 0,
      category: product.category,
      image: product.imageUrl || product.image || '',
      description: product.description || '',
      manufacturer: product.manufacturer || '',
      package: product.package || '',
      pinCount: product.pinCount || '',
      specifications: product.specifications || [],
      in_stock: true,
      source: 'local',
    }));

    // STEP 2: Cached equivalents.
    results.strategy.push('cache_check');

    let cachedEquiv = await EquivalentModel.findOne({
      primary_sku: { $regex: new RegExp(`^${safeSearch}$`, 'i') },
      expires_at: { $gt: new Date() },
    });

    if (cachedEquiv && cachedEquiv.source === 'nexar') {
      const validKeys = new Set(lookupAliases(searchTerm).map(normalizePartKey));
      const cachedKey = normalizePartKey(String(cachedEquiv.primary_mpn || cachedEquiv.primary_sku || ''));
      if (!validKeys.has(cachedKey)) {
        await EquivalentModel.deleteOne({ _id: cachedEquiv._id });
        results.strategy.push('invalid_cache_removed');
        cachedEquiv = null;
      }
    }
    if (cachedEquiv) {
      const cacheAgeDays = Math.floor(
        (Date.now() - cachedEquiv.cached_at.getTime()) / (24 * 60 * 60 * 1000)
      );

      results.cached_equivalents = {
        primary_sku: cachedEquiv.primary_sku,
        primary_mpn: cachedEquiv.primary_mpn || cachedEquiv.primary_sku,
        primary_description: cachedEquiv.primary_description || cachedEquiv.primary_name || '',
        primary_manufacturer: cachedEquiv.primary_manufacturer || '',
        primary_specs: cachedEquiv.primary_specs || {},
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
    if (!cachedEquiv && includeExternal && externalLookupAllowed) {
      results.strategy.push('nexar_api');

      try {
        const nexarResult = await searchNexarEquivalents(searchTerm);
        const equivalents = nexarResult.equivalents;

        if (nexarResult.sourceFound) {
          results.external_equivalents = {
            primary_sku: searchTerm,
            primary_mpn: nexarResult.source.mpn || nexarResult.resolvedQuery || searchTerm,
            primary_description: nexarResult.source.description || '',
            primary_manufacturer: nexarResult.source.manufacturer || '',
            primary_specs: nexarResult.source.specs || {},
            equivalents,
            source: 'nexar',
            count: equivalents.length,
          };

          // STEP 4: Cache identified Nexar parts even when similarParts is empty.
          // This prevents repeated allowance use for the same lookup and preserves
          // technical data for storefront enrichment.
          results.strategy.push('cache_save');

          await EquivalentModel.findOneAndUpdate(
            { primary_sku: searchTerm },
            {
              primary_sku: searchTerm,
              primary_mpn: nexarResult.source.mpn || nexarResult.resolvedQuery || searchTerm,
              primary_name: nexarResult.source.description || nexarResult.source.mpn || searchTerm,
              primary_description: nexarResult.source.description || '',
              primary_manufacturer: nexarResult.source.manufacturer || '',
              primary_specs: nexarResult.source.specs || {},
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
              expires_at: new Date(Date.now() + EQUIVALENT_CACHE_TTL_MS),
            },
            { upsert: true, new: true }
          );

          // STEP 5: Surface equivalents already sold by MacSunny.
          if (equivalents.length > 0) {
            await appendLocalEquivalentMatches(results, equivalents, searchTerm);
          }
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
      external_lookup_allowed: externalLookupAllowed,
      public_external_lookup_enabled: publicExternalEnabled,
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
    public_lookup_enabled: process.env.NEXAR_PUBLIC_LOOKUP_ENABLED === 'true',
  });
}
