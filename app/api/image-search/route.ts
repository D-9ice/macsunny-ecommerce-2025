import { NextResponse } from 'next/server';

/**
 * Image Search API - Multi-source image matching
 * Supports: Mouser API, Google Images, Unsplash
 * All API keys are optional - graceful fallback
 */

// Search Mouser Electronics API
async function searchMouser(sku: string): Promise<string | null> {
  const apiKey = process.env.MOUSER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.mouser.com/api/v1/search/keyword?apiKey=${apiKey}&keyword=${encodeURIComponent(sku)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.SearchResults?.Parts && data.SearchResults.Parts.length > 0) {
        const firstPart = data.SearchResults.Parts[0];
        return firstPart.ImagePath || firstPart.ProductDetailUrl || null;
      }
    }
  } catch (error) {
    console.error('Mouser API error:', error);
  }

  return null;
}

// Search Google Custom Search API
async function searchGoogle(query: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) return null;

  try {
    const searchQuery = `${query} electronic component`;
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=1`,
      {
        method: 'GET',
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].link;
      }
    }
  } catch (error) {
    console.error('Google Search API error:', error);
  }

  return null;
}

// Search Unsplash API
async function searchUnsplash(query: string): Promise<string | null> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;

  try {
    const searchQuery = `${query} electronic component`;
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Client-ID ${apiKey}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].urls.small;
      }
    }
  } catch (error) {
    console.error('Unsplash API error:', error);
  }

  return null;
}

/**
 * POST /api/image-search
 * Search for component images across multiple sources
 */
export async function POST(request: Request) {
  try {
    const { sku, name } = await request.json();

    if (!sku || !name) {
      return NextResponse.json(
        { success: false, message: 'SKU and name are required' },
        { status: 400 }
      );
    }

    // Priority 1: Mouser (most accurate for electronic components)
    const mouserImage = await searchMouser(sku);
    if (mouserImage) {
      return NextResponse.json({
        success: true,
        imageUrl: mouserImage,
        source: 'mouser',
        message: 'Image found on Mouser Electronics'
      });
    }

    // Priority 2: Google Images (broader search)
    const googleImage = await searchGoogle(`${sku} ${name}`);
    if (googleImage) {
      return NextResponse.json({
        success: true,
        imageUrl: googleImage,
        source: 'google',
        message: 'Image found via Google Search'
      });
    }

    // Priority 3: Unsplash (fallback for generic component images)
    const unsplashImage = await searchUnsplash(name);
    if (unsplashImage) {
      return NextResponse.json({
        success: true,
        imageUrl: unsplashImage,
        source: 'unsplash',
        message: 'Generic component image from Unsplash'
      });
    }

    // No image found from any source
    return NextResponse.json({
      success: false,
      imageUrl: null,
      source: null,
      message: 'No image found. Please upload manually or configure API keys.'
    });

  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { success: false, message: 'Image search failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/image-search/status
 * Check which image search APIs are configured
 */
export async function GET() {
  const status = {
    mouser: !!process.env.MOUSER_API_KEY,
    google: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID),
    unsplash: !!process.env.UNSPLASH_ACCESS_KEY,
  };

  return NextResponse.json({
    success: true,
    configured: status,
    message: Object.values(status).some(v => v)
      ? 'Some image search APIs are configured'
      : 'No image search APIs configured. Add API keys to .env.local to enable auto-image matching.'
  });
}
