import { NextResponse } from 'next/server';

/**
 * Component Image Search API
 * Uses Unsplash API to find component images based on product name
 */

export async function POST(request: Request) {
  try {
    const { name, category, sku } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      );
    }

    // Build search query (prioritize component type keywords)
    const searchQuery = `${name} ${category || ''} electronic component`.trim();

    // Use Unsplash API (free tier: 50 requests/hour)
    if (process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=squarish`,
          {
            headers: {
              'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
            }
          }
        );

        if (unsplashResponse.ok) {
          const data = await unsplashResponse.json();
          if (data.results && data.results.length > 0) {
            const imageUrl = data.results[0].urls.small;
            
            return NextResponse.json({
              success: true,
              imageUrl: imageUrl,
              source: 'Unsplash',
              attribution: data.results[0].user.name,
              attributionUrl: data.results[0].user.links.html
            });
          }
        }
      } catch (unsplashError) {
        console.error('Unsplash API error:', unsplashError);
        // Fall through to alternative methods
      }
    }

    // Fallback: Use Pexels API (free tier: 200 requests/hour)
    if (process.env.PEXELS_API_KEY) {
      try {
        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=square`,
          {
            headers: {
              'Authorization': process.env.PEXELS_API_KEY
            }
          }
        );

        if (pexelsResponse.ok) {
          const data = await pexelsResponse.json();
          if (data.photos && data.photos.length > 0) {
            const imageUrl = data.photos[0].src.medium;
            
            return NextResponse.json({
              success: true,
              imageUrl: imageUrl,
              source: 'Pexels',
              attribution: data.photos[0].photographer,
              attributionUrl: data.photos[0].photographer_url
            });
          }
        }
      } catch (pexelsError) {
        console.error('Pexels API error:', pexelsError);
        // Fall through to placeholder
      }
    }

    // Final fallback: Use placeholder with component name
    const placeholderUrl = `https://via.placeholder.com/300x300/1f2937/ffffff?text=${encodeURIComponent(name.substring(0, 20))}`;
    
    return NextResponse.json({
      success: true,
      imageUrl: placeholderUrl,
      source: 'Placeholder',
      message: 'Using placeholder - add UNSPLASH_ACCESS_KEY or PEXELS_API_KEY to .env.local for real images'
    });

  } catch (error: any) {
    console.error('Image search error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Image search failed: ${error?.message || 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
