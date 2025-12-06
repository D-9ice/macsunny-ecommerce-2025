'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/app/lib/products';

interface ComponentSearchBarProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  onBulkEdit: (products: Product[]) => void;
  placeholder?: string;
}

export default function ComponentSearchBar({
  products,
  onProductSelect,
  onBulkEdit,
  placeholder = 'Search components by name, SKU, category, specs... (e.g., 10k resistor, 0603, LM7805)',
}: ComponentSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    const filtered = products.filter((product) => {
      const searchableText = `
        ${product.name} 
        ${product.sku} 
        ${product.category} 
        ${(product as any).specifications || ''}
      `.toLowerCase();

      // Check if ALL search terms are present
      return searchTerms.every((term) => searchableText.includes(term));
    });

    // Rank results by relevance
    const ranked = filtered.map((product) => {
      let score = 0;
      
      // Exact SKU match gets highest priority
      if (product.sku.toLowerCase() === query.toLowerCase()) {
        score += 100;
      } else if (product.sku.toLowerCase().includes(query.toLowerCase())) {
        score += 50;
      }

      // Name match
      if (product.name.toLowerCase().includes(query.toLowerCase())) {
        score += 30;
      }

      // Category match
      if (product.category.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
      }

      // Check for partial matches
      searchTerms.forEach((term) => {
        if (product.name.toLowerCase().includes(term)) score += 5;
        if (product.sku.toLowerCase().includes(term)) score += 5;
      });

      return { product, score };
    });

    ranked.sort((a, b) => b.score - a.score);
    setResults(ranked.map((r) => r.product).slice(0, 20));
    setShowResults(true);
  }, [query, products]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleProductClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleProductClick = (product: Product) => {
    if (selectedProducts.has(product.sku)) {
      // Deselect
      const newSet = new Set(selectedProducts);
      newSet.delete(product.sku);
      setSelectedProducts(newSet);
    } else {
      onProductSelect(product);
      setQuery('');
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  const toggleProductSelection = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedProducts);
    if (newSet.has(product.sku)) {
      newSet.delete(product.sku);
    } else {
      newSet.add(product.sku);
    }
    setSelectedProducts(newSet);
  };

  const handleBulkEdit = () => {
    const selectedProductsList = products.filter((p) => selectedProducts.has(p.sku));
    onBulkEdit(selectedProductsList);
    setSelectedProducts(new Set());
    setQuery('');
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-10 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          🔍
        </span>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="mt-2 bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex items-center justify-between">
          <span className="text-blue-300 text-sm">
            {selectedProducts.size} component{selectedProducts.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm transition-colors"
            >
              Bulk Edit
            </button>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1 rounded text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-gray-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
          <div className="p-2">
            <p className="text-gray-400 text-xs px-2 py-1">
              {results.length} result{results.length > 1 ? 's' : ''} found
            </p>
          </div>
          {results.map((product, index) => (
            <div
              key={product.sku}
              onClick={() => handleProductClick(product)}
              className={`px-4 py-3 cursor-pointer border-t border-gray-800 transition-colors ${
                index === selectedIndex
                  ? 'bg-green-900/30 border-green-700'
                  : 'hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.sku)}
                  onChange={(e) => toggleProductSelection(product, e as any)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500"
                />
                <img
                  src={product.image || '/logo.svg'}
                  alt={product.name}
                  className="w-12 h-12 object-contain rounded bg-black/60"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.svg';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{product.name}</p>
                  <p className="text-gray-400 text-sm">
                    {product.sku} • {product.category}
                  </p>
                  {(product as any).specifications && (
                    <p className="text-gray-500 text-xs mt-1 truncate">
                      {(product as any).specifications}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-medium">GHS {product.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-gray-700 rounded-lg shadow-2xl p-6 text-center">
          <p className="text-gray-400">No components found matching "{query}"</p>
          <p className="text-gray-500 text-sm mt-2">
            Try searching by SKU, name, category, or specifications
          </p>
        </div>
      )}
    </div>
  );
}
