'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ComponentsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch categories from database
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Refresh categories when menu is opened (to reflect any updates)
  useEffect(() => {
    if (isOpen) {
      async function refreshCategories() {
        try {
          const res = await fetch('/api/categories');
          const data = await res.json();
          if (data.success && data.categories) {
            setCategories(data.categories);
          }
        } catch (error) {
          console.error('Failed to refresh categories:', error);
        }
      }
      refreshCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCategoryClick = (category: string) => {
    setIsOpen(false);
    router.push(`/?q=${encodeURIComponent(category)}`);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-6 rounded-md bg-gray-200 text-black font-medium hover:bg-gray-300 transition-colors flex items-center gap-2 whitespace-nowrap"
      >
        Components
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 force-bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 text-xs font-semibold uppercase force-gray-light">
            Browse by Category
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-2 force-black">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="px-4 py-2 force-black">No categories available</div>
            ) : (
              categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors font-medium force-black"
                >
                  {category}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/');
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm force-gray-medium"
            >
              View All Components
            </button>
          </div>
        </div>
      )}
    </div>
  );
}