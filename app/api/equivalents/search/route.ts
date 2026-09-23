import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import { isNexarConfigured, searchNexarEquivalents } from '@/app/lib/nexar';
import { isMouserConfigured, searchMouserComponent } from '@/app/lib/mouser';
import { EquivalentModel, EQUIVALENT_CACHE_TTL_MS } from '@/app/lib/equivalents';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import { rateAllowed, readBoundedJson } from '@/app/lib/requestSecurity';

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
}

function normalizePartKey(value: unknown) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function lookupAliases(value: string) {
  const compact = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^[ABCDJK]\d+[A-Z0-9-]*$/.test(compact)) return [compact, '2S' + compact];
  return [compact];
}

function allDatasheetManualReferenceUrl(partNumber: string) {
  return 'https://www.alldatasheet.net/view.jsp?Searchword=' + encodeURIComponent(partNumber.trim());
}

async function appendLocalEquivalentMatches(results: any, equivalents: any[], searchTerm: string) {
  for (const equivalent of equivalents) {
    const mpn = String(equivalent.mpn || '').trim();
    if (!mpn) continue;

    const exact = new RegExp('^' + escapeRegex(mpn) + '$', 'i');
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
        mpn: localMatch.mpn || '',
        name: localMatch.name,
        price: localMatch.price,
        quantity: localMatch.quantity || 0,
        category: localMatch.category,
        image: localMatch.imageUrl || localMatch.image || '',
        description: localMatch.description || '',
        manufacturer: localMatch.manufacturer || '',
        package: localMatch.package || '',
        pinCount: localMatch.pinCount || '',
        specifications: localMatch.specifications || [],
        in_stock: true,
        source: 'local',
        equivalent_of: searchTerm,
      });
    }
  }
}

function normalizeEquivalents(items: any[]) {
  const seen = new Set<string>();
  return (items || []).filter((item) => {
    const key = normalizePartKey(item?.mpn);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Smart component equivalent search.
 *
 * 1. MacSunny local inventory
 * 2. 90-day MongoDB cache
 * 3. Nexar Supply GraphQL
 * 4. Mouser Search API V2 fallback
 * 5. Cache verified technical data/replacements
 * 6. Cross-check alternatives against MacSunny inventory
 *
 * AllDatasheet remains manual-reference only because its API was discontinued.
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateAllowed(request, 'equivalent-search', 60, 5 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Too many equivalent-search requests. Please wait a moment.' }, { status: 429 });
    }
    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.message }, { status: parsed.status });
    }

    await connectDB();

    const { query, includeExternal = true } = parsed.value;
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Search query required' },
        { status: 400 },
      );
    }

    const searchTerm = query.trim().toUpperCase();
    if (!searchTerm || searchTerm.length > 120) {
      return NextResponse.json(
        { success: false, error: 'Invalid search query' },
        { status: 400 },
      );
    }

    const safeSearch = escapeRegex(searchTerm);
    const adminAuthenticated = await isAdminAuthenticated();

    const nexarPublicEnabled = process.env.NEXAR_PUBLIC_LOOKUP_ENABLED === 'true';
    const mouserPublicEnabled = process.env.MOUSER_PUBLIC_LOOKUP_ENABLED === 'true';

    const nexarLookupAllowed =
      isNexarConfigured() && (adminAuthenticated || nexarPublicEnabled);
    const mouserLookupAllowed =
      isMouserConfigured() && (adminAuthenticated || mouserPublicEnabled);

    const results: any = {
      query: searchTerm,
      found_in_inventory: [],
      cached_equivalents: null,
      external_equivalents: null,
      external_mouser: null,
      manual_reference: {
        provider: 'AllDatasheet',
        mode: 'manual',
        url: allDatasheetManualReferenceUrl(searchTerm),
      },
      external_providers: {
        nexar: {
          configured: isNexarConfigured(),
          lookup_allowed: nexarLookupAllowed,
          public_lookup_enabled: nexarPublicEnabled,
        },
        mouser: {
          configured: isMouserConfigured(),
          lookup_allowed: mouserLookupAllowed,
          public_lookup_enabled: mouserPublicEnabled,
        },
      },
      strategy: [],
    };

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

    results.strategy.push('cache_check');
    let cachedEquiv = await EquivalentModel.findOne({
      primary_sku: { $regex: new RegExp('^' + safeSearch + '$', 'i') },
      expires_at: { $gt: new Date() },
    });

    if (cachedEquiv && ['nexar', 'mouser'].includes(String(cachedEquiv.source || ''))) {
      const validKeys = new Set(lookupAliases(searchTerm).map(normalizePartKey));
      const cachedKey = normalizePartKey(
        cachedEquiv.primary_mpn || cachedEquiv.primary_sku || '',
      );

      if (!validKeys.has(cachedKey)) {
        await EquivalentModel.deleteOne({ _id: cachedEquiv._id });
        results.strategy.push('invalid_cache_removed');
        cachedEquiv = null;
      }
    }

    if (cachedEquiv) {
      const cacheAgeDays = Math.floor(
        (Date.now() - cachedEquiv.cached_at.getTime()) / (24 * 60 * 60 * 1000),
      );

      results.cached_equivalents = {
        primary_sku: cachedEquiv.primary_sku,
        primary_mpn: cachedEquiv.primary_mpn || cachedEquiv.primary_sku,
        primary_description:
          cachedEquiv.primary_description || cachedEquiv.primary_name || '',
        primary_manufacturer: cachedEquiv.primary_manufacturer || '',
        primary_datasheet_url: cachedEquiv.primary_datasheet_url || '',
        primary_reference_url: cachedEquiv.primary_reference_url || '',
        primary_specs: cachedEquiv.primary_specs || {},
        equivalents: cachedEquiv.equivalents || [],
        source: cachedEquiv.source,
        cached_at: cachedEquiv.cached_at,
        cache_age_days: cacheAgeDays,
        expires_in_days: Math.max(
          0,
          Math.floor(
            (cachedEquiv.expires_at.getTime() - Date.now()) /
              (24 * 60 * 60 * 1000),
          ),
        ),
      };

      await appendLocalEquivalentMatches(
        results,
        cachedEquiv.equivalents || [],
        searchTerm,
      );
    }

    let externalRecord: any = null;
    let nexarSourceFound = false;

    if (!cachedEquiv && includeExternal && nexarLookupAllowed) {
      results.strategy.push('nexar_api');

      try {
        const nexarResult = await searchNexarEquivalents(searchTerm);
        if (nexarResult.sourceFound) {
          nexarSourceFound = true;
          externalRecord = {
            primary_sku: searchTerm,
            primary_mpn:
              nexarResult.source.mpn || nexarResult.resolvedQuery || searchTerm,
            primary_description: nexarResult.source.description || '',
            primary_manufacturer: nexarResult.source.manufacturer || '',
            primary_datasheet_url: '',
            primary_reference_url: '',
            primary_specs: nexarResult.source.specs || {},
            equivalents: normalizeEquivalents(nexarResult.equivalents || []),
            source: 'nexar',
          };

          results.external_equivalents = {
            ...externalRecord,
            count: externalRecord.equivalents.length,
          };
        }
      } catch (error: any) {
        console.error('Nexar equivalent search failed:', error);
        results.nexar_error = error?.message || 'Nexar external search failed';
      }
    }

    const shouldTryMouser =
      !cachedEquiv &&
      includeExternal &&
      mouserLookupAllowed &&
      (!nexarSourceFound || (externalRecord?.equivalents || []).length === 0);

    if (shouldTryMouser) {
      results.strategy.push('mouser_api');

      try {
        const mouserResult = await searchMouserComponent(searchTerm);

        if (mouserResult.found) {
          const mouserEquivalents = normalizeEquivalents(
            mouserResult.equivalents || [],
          );

          results.external_mouser = {
            primary_sku: searchTerm,
            primary_mpn:
              mouserResult.source.mpn || mouserResult.resolvedQuery || searchTerm,
            primary_description: mouserResult.source.description || '',
            primary_manufacturer: mouserResult.source.manufacturer || '',
            primary_datasheet_url: mouserResult.source.datasheetUrl || '',
            primary_reference_url: mouserResult.source.productUrl || '',
            primary_specs: mouserResult.source.specs || {},
            equivalents: mouserEquivalents,
            source: 'mouser',
          };

          if (externalRecord) {
            externalRecord = {
              ...externalRecord,
              primary_description:
                externalRecord.primary_description ||
                mouserResult.source.description ||
                '',
              primary_manufacturer:
                externalRecord.primary_manufacturer ||
                mouserResult.source.manufacturer ||
                '',
              primary_datasheet_url:
                mouserResult.source.datasheetUrl ||
                externalRecord.primary_datasheet_url ||
                '',
              primary_reference_url:
                mouserResult.source.productUrl ||
                externalRecord.primary_reference_url ||
                '',
              primary_specs: {
                ...(mouserResult.source.specs || {}),
                ...(externalRecord.primary_specs || {}),
              },
              equivalents:
                (externalRecord.equivalents || []).length > 0
                  ? externalRecord.equivalents
                  : mouserEquivalents,
            };
          } else {
            externalRecord = {
              ...results.external_mouser,
              source: 'mouser',
            };
          }

          results.external_equivalents = {
            ...externalRecord,
            count: (externalRecord.equivalents || []).length,
          };
        }
      } catch (error: any) {
        console.error('Mouser lookup failed:', error);
        results.mouser_error = error?.message || 'Mouser external search failed';
      }
    }

    if (!cachedEquiv && externalRecord) {
      results.strategy.push('cache_save');

      await EquivalentModel.findOneAndUpdate(
        { primary_sku: searchTerm },
        {
          primary_sku: searchTerm,
          primary_mpn: externalRecord.primary_mpn || searchTerm,
          primary_name:
            externalRecord.primary_description ||
            externalRecord.primary_mpn ||
            searchTerm,
          primary_description: externalRecord.primary_description || '',
          primary_manufacturer: externalRecord.primary_manufacturer || '',
          primary_datasheet_url: externalRecord.primary_datasheet_url || '',
          primary_reference_url: externalRecord.primary_reference_url || '',
          primary_specs: externalRecord.primary_specs || {},
          equivalents: (externalRecord.equivalents || []).map((equivalent: any) => ({
            mpn: equivalent.mpn,
            manufacturer: equivalent.manufacturer || '',
            description: equivalent.description || '',
            specs: equivalent.specs || {},
            in_stock_external: Boolean(equivalent.in_stock_external),
            distributor: equivalent.distributor || externalRecord.source,
            compatibility: 1.0,
          })),
          source: externalRecord.source === 'mouser' ? 'mouser' : 'nexar',
          cached_at: new Date(),
          expires_at: new Date(Date.now() + EQUIVALENT_CACHE_TTL_MS),
        },
        { upsert: true, new: true },
      );

      if ((externalRecord.equivalents || []).length > 0) {
        await appendLocalEquivalentMatches(
          results,
          externalRecord.equivalents,
          searchTerm,
        );
      }
    }

    const summary = {
      total_results: results.found_in_inventory.length,
      has_local_stock: results.found_in_inventory.length > 0,
      has_cached_data: Boolean(results.cached_equivalents),
      has_external_data: Boolean(results.external_equivalents),
      cache_used: Boolean(results.cached_equivalents),
      api_called:
        results.strategy.includes('nexar_api') ||
        results.strategy.includes('mouser_api'),
      nexar_api_called: results.strategy.includes('nexar_api'),
      mouser_api_called: results.strategy.includes('mouser_api'),
      external_configured: isNexarConfigured() || isMouserConfigured(),
      external_lookup_allowed: nexarLookupAllowed || mouserLookupAllowed,
      public_external_lookup_enabled:
        nexarPublicEnabled || mouserPublicEnabled,
      nexar_configured: isNexarConfigured(),
      mouser_configured: isMouserConfigured(),
      external_provider: 'nexar+mouser',
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
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    info: 'POST with { "query": "COMPONENT_SKU" } to search for equivalents',
    provider: 'nexar+mouser',
    nexar_configured: isNexarConfigured(),
    mouser_configured: isMouserConfigured(),
    public_lookup_enabled:
      process.env.NEXAR_PUBLIC_LOOKUP_ENABLED === 'true' ||
      process.env.MOUSER_PUBLIC_LOOKUP_ENABLED === 'true',
  });
}
