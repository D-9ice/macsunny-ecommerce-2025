import { NextRequest, NextResponse } from 'next/server';

const OCTOPART_API_KEY = process.env.OCTOPART_API_KEY;
const OCTOPART_API_URL = 'https://octopart.com/api/v4/rest/parts/search';

interface OctopartSpec {
  attribute: { name: string };
  display_value: string;
}

interface OctopartPart {
  mpn: string;
  manufacturer: { name: string };
  short_description: string;
  specs: OctopartSpec[];
  best_datasheet?: { url: string };
  median_price_1000?: { price: number; currency: string };
  offers?: Array<{ seller: { name: string }; inventory_level?: number }>;
}

interface ExternalEquivalent {
  mpn: string;
  manufacturer: string;
  description: string;
  specs: Record<string, string>;
  in_stock_external: boolean;
  distributor: string;
  datasheet_url?: string;
  price_info?: string;
}

/**
 * Search Octopart for component equivalents and alternatives
 * Octopart aggregates data from 1000+ distributors including DigiKey, Mouser, Farnell
 */
export async function POST(request: NextRequest) {
  try {
    const { partNumber } = await request.json();

    if (!partNumber || typeof partNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid part number required' },
        { status: 400 }
      );
    }

    if (!OCTOPART_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Octopart API key not configured',
          hint: 'Set OCTOPART_API_KEY environment variable'
        },
        { status: 503 }
      );
    }

    console.log(`🔍 Searching Octopart for: ${partNumber}`);

    // Octopart v4 REST API search
    const response = await fetch(OCTOPART_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': OCTOPART_API_KEY,
      },
      body: JSON.stringify({
        queries: [{
          mpn: partNumber.trim(),
          reference: partNumber,
        }],
        options: {
          include_specs: true,
          include_imagesets: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Octopart API error:', response.status, errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Invalid Octopart API key' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Octopart API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ Octopart response received for ${partNumber}`);

    const equivalents: ExternalEquivalent[] = [];

    // Process results
    if (data.results && data.results.length > 0) {
      const result = data.results[0];

      if (result.items && result.items.length > 0) {
        for (const item of result.items.slice(0, 10)) {
          // Each item represents a matching part
          const part: OctopartPart = item;

          // Extract specifications
          const specs: Record<string, string> = {};
          if (part.specs && Array.isArray(part.specs)) {
            for (const spec of part.specs) {
              if (spec.attribute?.name && spec.display_value) {
                specs[spec.attribute.name] = spec.display_value;
              }
            }
          }

          // Check stock availability across distributors
          const hasStock = !!(part.offers && part.offers.length > 0);
          const distributorNames = hasStock 
            ? [...new Set(part.offers!.map(o => o.seller.name))].join(', ')
            : 'Unknown';

          // Price info (if available)
          let priceInfo: string | undefined;
          if (part.median_price_1000) {
            priceInfo = `~${part.median_price_1000.currency} ${part.median_price_1000.price.toFixed(2)} (1k qty)`;
          }

          equivalents.push({
            mpn: part.mpn,
            manufacturer: part.manufacturer?.name || 'Unknown',
            description: part.short_description || 'No description',
            specs,
            in_stock_external: hasStock,
            distributor: distributorNames,
            datasheet_url: part.best_datasheet?.url,
            price_info: priceInfo,
          });
        }
      }
    }

    if (equivalents.length === 0) {
      console.log(`⚠️ No equivalents found for ${partNumber}`);
      return NextResponse.json({
        success: true,
        partNumber,
        equivalents: [],
        message: 'No matching components found in Octopart database',
      });
    }

    console.log(`✅ Found ${equivalents.length} equivalent(s) for ${partNumber}`);

    return NextResponse.json({
      success: true,
      partNumber,
      equivalents,
      source: 'octopart',
      count: equivalents.length,
    });

  } catch (error: any) {
    console.error('Octopart search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'External search failed',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: !!OCTOPART_API_KEY,
    provider: 'Octopart v4 REST API',
    message: OCTOPART_API_KEY 
      ? 'Octopart API is configured and ready' 
      : 'Set OCTOPART_API_KEY environment variable to enable external component search',
  });
}
