'use client';
import { useState } from 'react';
import { Wand2, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';

interface ImageMatchResult {
  sku: string;
  name: string;
  matched: boolean;
  imageUrl?: string;
  method?: 'local' | 'unsplash' | 'ai-generated';
}

export default function AutoImageMatcher({ onComplete }: { onComplete: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImageMatchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [unsplashApiKey, setUnsplashApiKey] = useState('');

  const searchUnsplash = async (query: string): Promise<string | null> => {
    if (!unsplashApiKey) return null;
    
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`,
        {
          headers: {
            'Authorization': `Client-ID ${unsplashApiKey}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          return data.results[0].urls.small;
        }
      }
    } catch (error) {
      console.error('Unsplash search failed:', error);
    }
    
    return null;
  };

  const generateImageWithAI = async (productName: string): Promise<string | null> => {
    // Placeholder for AI image generation
    // You can integrate with OpenAI DALL-E, Stability AI, or other services
    console.log('AI generation would create image for:', productName);
    return null;
  };

  const matchImageToSKU = async (sku: string, name: string): Promise<ImageMatchResult> => {
    // Strategy 1: Check if image exists in public/components folder
    const imageName = sku.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.jpg';
    const localImagePath = `/components/${imageName}`;
    
    try {
      const response = await fetch(localImagePath, { method: 'HEAD' });
      if (response.ok) {
        return {
          sku,
          name,
          matched: true,
          imageUrl: localImagePath,
          method: 'local'
        };
      }
    } catch (error) {
      // Image doesn't exist locally
    }

    // Strategy 2: Search Unsplash for component image
    if (unsplashApiKey) {
      const unsplashUrl = await searchUnsplash(`electronic component ${name}`);
      if (unsplashUrl) {
        return {
          sku,
          name,
          matched: true,
          imageUrl: unsplashUrl,
          method: 'unsplash'
        };
      }
    }

    // Strategy 3: AI generation (if enabled)
    if (useAI) {
      const aiImageUrl = await generateImageWithAI(name);
      if (aiImageUrl) {
        return {
          sku,
          name,
          matched: true,
          imageUrl: aiImageUrl,
          method: 'ai-generated'
        };
      }
    }

    return {
      sku,
      name,
      matched: false
    };
  };

  const handleAutoMatch = async () => {
    setIsProcessing(true);
    setShowResults(false);
    setResults([]);

    try {
      // Fetch all products without images
      const response = await fetch('/api/products');
      if (!response.ok) {
        alert('Failed to load products');
        setIsProcessing(false);
        return;
      }

      const data = await response.json();
      const products = data.products || [];
      
      // Filter products with missing or placeholder images
      const productsNeedingImages = products.filter(
        (p: any) => !p.image || p.image === '/logo.svg' || p.image === '/macsunny-logo.png'
      );

      if (productsNeedingImages.length === 0) {
        alert('All products already have images!');
        setIsProcessing(false);
        return;
      }

      const matchResults: ImageMatchResult[] = [];

      // Process each product
      for (const product of productsNeedingImages) {
        const result = await matchImageToSKU(product.sku, product.name);
        matchResults.push(result);

        // If matched, update the product in database
        if (result.matched && result.imageUrl) {
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              image: result.imageUrl
            })
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setResults(matchResults);
      setShowResults(true);
      onComplete();
      
    } catch (error) {
      console.error('Auto-match failed:', error);
      alert('Failed to auto-match images');
    } finally {
      setIsProcessing(false);
    }
  };

  const matchedCount = results.filter(r => r.matched).length;
  const unmatchedCount = results.filter(r => !r.matched).length;

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-2 border-indigo-500/50 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Wand2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            🎨 Auto Image Matcher
          </h2>
          <p className="text-sm text-gray-400">Automatically find and assign images to products</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-indigo-200">
            <p className="font-semibold mb-2">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Scans all products with missing images</li>
              <li>Searches for matching images in <code className="bg-indigo-800 px-1 rounded">/public/components/</code> folder</li>
              <li>Falls back to Unsplash API (if configured)</li>
              <li>Can use AI generation for custom component images (optional)</li>
              <li>Automatically updates product images in database</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Configuration Options */}
      <div className="space-y-4 mb-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            Unsplash API Key (Optional)
          </label>
          <input
            type="text"
            value={unsplashApiKey}
            onChange={(e) => setUnsplashApiKey(e.target.value)}
            placeholder="Enter your Unsplash Access Key"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get free API key at <a href="https://unsplash.com/developers" target="_blank" className="text-indigo-400 hover:underline">unsplash.com/developers</a>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useAI"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="useAI" className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Enable AI Image Generation (Coming Soon)
          </label>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleAutoMatch}
        disabled={isProcessing}
        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all transform hover:scale-105 disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Matching Images...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Wand2 className="w-5 h-5" />
            Auto-Match All Images
          </span>
        )}
      </button>

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Matching Results</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-4 h-4" />
                {matchedCount} matched
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-4 h-4" />
                {unmatchedCount} unmatched
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                  result.matched
                    ? 'bg-green-900/20 text-green-300'
                    : 'bg-red-900/20 text-red-300'
                }`}
              >
                {result.matched ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="font-mono text-xs">{result.sku}</span>
                <span className="flex-1">{result.name}</span>
                {result.method && (
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {result.method}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 text-xs text-gray-500">
        <p className="font-semibold mb-1">💡 Tips for best results:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Place component images in <code className="bg-gray-800 px-1 rounded">/public/components/</code> folder</li>
          <li>Name files using SKU format: <code className="bg-gray-800 px-1 rounded">res-10k.jpg</code></li>
          <li>Configure Unsplash API for automatic online image search</li>
          <li>AI generation requires API integration (OpenAI DALL-E, Stability AI)</li>
        </ul>
      </div>
    </div>
  );
}
