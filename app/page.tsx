'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product, allProducts, readAdmin } from './lib/products';
import { addToCart, getCart } from './lib/cart';
import { showToast } from './components/Toast';
import WhatsAppFab from './components/WhatsAppFab';
import ComponentsMenu from './components/ComponentsMenu';
import AIChatFab from './components/AIChatFab';
import LocationFab from './components/LocationFab';

const MAX_RESULTS = 25;

function filterProducts(query: string, productsList: Product[]): Product[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return productsList.slice(0, MAX_RESULTS);
  }

  return productsList
    .filter((product) => {
      const name = product.name.toLowerCase();
      const category = product.category.toLowerCase();
      const sku = product.sku.toLowerCase();
      return (
        name.includes(trimmed) ||
        category.includes(trimmed) ||
        sku.includes(trimmed)
      );
    })
    .slice(0, MAX_RESULTS);
}

function HomeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') ?? '';

  const [allProductsList, setAllProductsList] = useState<Product[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Fetch from database API instead of localStorage
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          if (data.products && data.products.length > 0) {
            setAllProductsList(data.products);
          } else {
            // Fallback to default products
            setAllProductsList(allProducts());
          }
        } else {
          // Fallback to localStorage/default
          const adminProducts = readAdmin();
          if (adminProducts && adminProducts.length > 0) {
            setAllProductsList(adminProducts);
          } else {
            setAllProductsList(allProducts());
          }
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        // Fallback to localStorage/default
        const adminProducts = readAdmin();
        if (adminProducts && adminProducts.length > 0) {
          setAllProductsList(adminProducts);
        } else {
          setAllProductsList(allProducts());
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    setItems(filterProducts(q, allProductsList));
  }, [q, allProductsList]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        router.push('/admin');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router]);

  // Update cart count on mount and after adding items
  useEffect(() => {
    const updateCartCount = () => {
      const cart = getCart();
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
      setCartCount(totalItems);
    };

    updateCartCount();
    // Listen for storage changes from other tabs
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = (formData.get('q') as string) ?? '';
    router.push(query ? `/?q=${encodeURIComponent(query)}` : '/');
  };

  const handleAddToCart = (product: Product) => {
    try {
      addToCart({
        sku: product.sku,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: 1,
      });
      // Update cart count immediately
      const cart = getCart();
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
      setCartCount(totalItems);
      // Show success toast
      showToast(`${product.name} added to cart!`, 'success');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showToast('Failed to add item to cart. Please try again.', 'error');
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-80">
      <form className="mb-6 flex flex-col gap-3 md:flex-row md:items-center" onSubmit={handleSearch}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search components (e.g., 10k resistor, 0603, LM7805)"
          aria-label="Search products"
          className="w-full rounded-md border border-gray-700 bg-black px-3 py-2.5 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none md:h-10"
        />
        <div className="flex flex-shrink-0 items-stretch gap-3">
          <button
            type="submit"
            className="h-10 w-24 rounded-md bg-green-700 font-medium text-white transition-colors hover:bg-green-800"
          >
            Search
          </button>
          <Link
            href="/cart"
            id="cartBtn"
            className="relative flex h-10 w-24 items-center justify-center rounded-md bg-yellow-400 font-medium text-black transition-colors hover:bg-yellow-500"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <ComponentsMenu />
        </div>
      </form>

      {q && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-gray-400">Showing results for:</span>
          <span className="font-semibold text-white">{q}</span>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-green-400 transition-colors hover:text-green-300"
          >
            Clear
          </button>
        </div>
      )}

      <h2 className="mb-4 text-xl font-semibold">
        {q ? `Search Results (${items.length})` : 'Latest Components'}
      </h2>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-zinc-900 p-4 animate-pulse"
            >
              <div className="h-32 w-full rounded-lg bg-gray-800" />
              <div className="h-6 w-3/4 rounded bg-gray-800" />
              <div className="h-4 w-1/2 rounded bg-gray-700" />
              <div className="h-5 w-1/3 rounded bg-gray-800" />
              <div className="mt-auto h-10 w-full rounded-md bg-gray-800" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <p className="text-lg">No products found for "{q}"</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-4 rounded-md bg-green-700 px-6 py-2 font-medium text-white transition-colors hover:bg-green-800"
          >
            View All Products
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((product) => (
            <article
              key={product.sku}
              className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-zinc-900 p-4 text-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-green-500"
            >
              <div className="relative h-32 w-full overflow-hidden rounded-lg bg-black/60 cursor-zoom-in group">
                <img
                  src={product.image || '/macsunny-logo.png'}
                  alt={product.name}
                  className="h-full w-full object-contain transition-all duration-500 group-hover:scale-125"
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.src = '/macsunny-logo.png';
                  }}
                />
              </div>
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-400">
                {product.sku} • {product.category}
              </p>
              <p className="text-base font-medium text-yellow-300">
                GHS {product.price.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => handleAddToCart(product)}
                className="mt-auto w-full rounded-md bg-yellow-400 px-4 py-2 font-medium text-black transition-colors hover:bg-yellow-500"
              >
                Add to Cart
              </button>
            </article>
          ))}
        </div>
      )}

      <WhatsAppFab />
      <AIChatFab />
      <LocationFab />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-6 text-gray-300">Loading...</div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
