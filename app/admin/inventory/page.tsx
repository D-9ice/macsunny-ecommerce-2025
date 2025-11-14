'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, allProducts, writeAdmin, readAdmin, readCategories, writeCategories } from '@/app/lib/products';
import MongoStatus from '@/app/components/MongoStatus';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Product>({
    sku: '',
    name: '',
    category: '',
    price: 0,
    image: '/logo.svg',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('/logo.svg');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        // Fallback to localStorage
        setProducts(allProducts());
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts(allProducts());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Product) => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value as string) || 0 : value,
    }));
  };

  /**
   * handleImageChange:
   * Accepts either a File object (from drag/drop) OR the change event from an <input type="file" />
   */
  const handleImageChange = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    const file =
      fileOrEvent instanceof File
        ? fileOrEvent
        : (fileOrEvent.target.files ? fileOrEvent.target.files[0] : undefined);

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
  setFormData((prev: Product) => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async () => {
    if (!formData.sku || !formData.name || !formData.category || formData.price <= 0) {
      alert('Please fill in all fields correctly');
      return;
    }

    if (products.some(p => p.sku === formData.sku)) {
      alert('SKU already exists!');
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadProducts();
        setShowAddForm(false);
        resetForm();
        alert('Product added successfully!');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setImagePreview(product.image);
    setShowAddForm(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadProducts();
        setEditingProduct(null);
        setShowAddForm(false);
        resetForm();
        alert('Product updated successfully!');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product');
    }
  };

  const handleDeleteProduct = async (sku: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadProducts();
        alert('Product deleted successfully!');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('/logo.svg');
    setFormData({ sku: '', name: '', category: '', price: 0, image: '/logo.svg' });
  };

  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert('Please enter a category name');
      return;
    }

    const cleanCategory = newCategory.trim();
    if (categories.includes(cleanCategory)) {
      alert('Category already exists');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanCategory }),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCategories(); // Refresh categories list
        setNewCategory('');
        setShowCategoryForm(false);
        alert('Category added successfully!');
      } else {
        alert(data.message || 'Failed to add category');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('Failed to add category');
    }
  };

  const handleEditCategory = (categoryName: string) => {
    setEditingCategory(categoryName);
    setNewCategory(categoryName);
    setShowCategoryForm(true);
  };

  const handleUpdateCategory = async () => {
    if (!newCategory.trim() || !editingCategory) {
      alert('Please enter a category name');
      return;
    }

    const cleanCategory = newCategory.trim();
    
    if (cleanCategory === editingCategory) {
      alert('No changes made');
      setEditingCategory(null);
      setNewCategory('');
      setShowCategoryForm(false);
      return;
    }

    if (categories.includes(cleanCategory)) {
      alert('Category already exists');
      return;
    }

    try {
      // First, update all products that use this category
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      if (productsData.success && productsData.products) {
        const productsToUpdate = productsData.products.filter(
          (p: Product) => p.category === editingCategory
        );
        
        for (const product of productsToUpdate) {
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...product, category: cleanCategory }),
          });
        }
      }

      // Delete the old category
      await fetch(`/api/categories?name=${encodeURIComponent(editingCategory)}`, {
        method: 'DELETE',
      });

      // Add the new category
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanCategory }),
      });

      await loadCategories();
      await loadProducts();
      setNewCategory('');
      setEditingCategory(null);
      setShowCategoryForm(false);
      alert('Category updated successfully!');
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories?name=${encodeURIComponent(categoryName)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCategories();
        alert('Category deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageChange(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
  <main className="min-h-screen bg-black text-white p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            {showCategoryForm ? 'Cancel' : '+ Add Category'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingProduct(null);
              setImageFile(null);
              setImagePreview('/logo.svg');
              setFormData({ sku: '', name: '', category: '', price: 0, image: '/logo.svg' });
            }}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
          >
            + Add Product
          </button>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* ✅ MongoDB Connection Status Banner */}
      <div className="mb-6">
        <MongoStatus />
      </div>


        {showCategoryForm && (
          <div className="mb-8 bg-blue-900/20 border border-blue-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Sensors, Connectors, Tools"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
              {editingCategory ? (
                <>
                  <button
                    onClick={handleUpdateCategory}
                    className="px-6 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setNewCategory('');
                    }}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleAddCategory}
                  className="px-6 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Add
                </button>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Current categories:</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div
                    key={cat}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg"
                  >
                    <span>{cat}</span>
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Edit category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="mb-8 bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  disabled={!!editingProduct}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50"
                  placeholder="e.g., RES-10K-0603"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="e.g., Resistor 10kΩ 1% 0603"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price (GHS)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="0.00"
                />
              </div>

              {/* Drag-and-Drop Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Product Image</label>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  role="button"
                  tabIndex={0}
                  onKeyDown={() => {}}
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer focus:outline-none ${
                    isDragging
                      ? 'border-green-400 bg-gradient-to-b from-green-950/5 to-transparent shadow-[0_8px_30px_rgba(16,185,129,0.06)]'
                      : 'border-gray-700 bg-gray-800/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div
                      className={`w-40 h-40 rounded-lg overflow-hidden flex items-center justify-center transform transition-all duration-300 ${
                        imagePreview ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
                      }`}
                      aria-hidden={false}
                    >
                      {/* preview with fade and scale */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg transition-opacity duration-300 ease-out"
                        style={{ willChange: 'opacity, transform' }}
                      />
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-300 mb-2">
                        {isDragging ? 'Drop to upload' : (editingProduct ? 'Drop an image or click to replace' : 'Drop an image here or click to upload')}
                      </p>

                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-400">Supports JPG, PNG, GIF.</span>
                        <span className="text-xs text-gray-500">Max 5MB.</span>
                      </div>
                    </div>

                    {/* invisible file input that still receives clicks */}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* subtle animated ring when dragging */}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 rounded-lg transition-opacity duration-300 ${
                      isDragging ? 'opacity-100 animate-pulse' : 'opacity-0'
                    }`}
                    style={{ boxShadow: isDragging ? '0 8px 30px rgba(16,185,129,0.12)' : 'none' }}
                  />
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {editingProduct ? 'Upload a new image to replace the current one' : 'Upload a product image'} (max 5MB).
                </p>

                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(editingProduct.image);
                      setImageFile(null);
                      setFormData((prev: Product) => ({ ...prev, image: editingProduct.image }));
                    }}
                    className="text-xs text-blue-400 hover:underline mt-1"
                  >
                    Reset to original image
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                className="px-6 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {products.map((product) => (
                  <tr key={product.sku} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{product.sku}</td>
                    <td className="px-6 py-4 text-sm">{product.name}</td>
                    <td className="px-6 py-4 text-sm">{product.category}</td>
                    <td className="px-6 py-4 text-sm">GHS {product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded mr-2 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.sku)}
                        className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No products in inventory. Click &quot;Add Product&quot; to get started.
          </div>
        )}
      </div>
    </main>
  );
}
