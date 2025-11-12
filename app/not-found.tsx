'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Home, Wrench } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const popularCategories = [
    'Resistors',
    'Capacitors',
    'ICs',
    'Transistors',
    'Modules',
    'Semiconductors',
  ];

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-8 flex items-center gap-4">
        <img
          src="/macsunny-logo.png"
          alt="MacSunny Electronics logo"
          className="h-24 w-24 animate-spin-horizontal"
        />
        <div className="text-left">
          <h1 className="text-6xl font-bold text-yellow-400">404</h1>
          <p className="text-lg text-gray-400">Page Not Found</p>
        </div>
      </div>

      <div className="mb-8 max-w-md">
        <p className="mb-4 text-xl font-semibold">
          Oops! We couldn't find that component.
        </p>
        <p className="text-gray-400">
          The page you're looking for doesn't exist or may have been moved.
          Try searching for what you need below.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="mb-8 flex w-full max-w-md gap-2"
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for components..."
          className="flex-1 rounded-md border border-gray-700 bg-black px-4 py-2.5 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-md bg-green-700 px-6 py-2.5 font-medium text-white transition-colors hover:bg-green-800"
        >
          <Search className="h-5 w-5" />
          Search
        </button>
      </form>

      <div className="mb-8">
        <p className="mb-3 text-sm font-semibold uppercase text-gray-400">
          Popular Categories
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {popularCategories.map((category) => (
            <Link
              key={category}
              href={`/?q=${encodeURIComponent(category)}`}
              className="rounded-full border border-gray-700 bg-zinc-900 px-4 py-2 text-sm transition-colors hover:border-green-500 hover:bg-green-900/20"
            >
              <Wrench className="mr-1 inline h-4 w-4" />
              {category}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md bg-yellow-400 px-6 py-3 font-medium text-black transition-colors hover:bg-yellow-500"
        >
          <Home className="h-5 w-5" />
          Back to Home
        </Link>
        <Link
          href="/cart"
          className="flex items-center gap-2 rounded-md border border-gray-700 bg-zinc-900 px-6 py-3 font-medium transition-colors hover:border-green-500 hover:bg-green-900/20"
        >
          View Cart
        </Link>
      </div>
    </div>
  );
}
