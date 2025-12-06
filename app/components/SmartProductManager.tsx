'use client';
import { useState, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Download, Trash2, Sparkles, FileText } from 'lucide-react';

interface ImportProduct {
  sku: string;
  name: string;
  category?: string;
  price?: string | number;
  image?: string;
  imageFile?: File;
  imageSource?: 'ai-recognized' | 'manual' | 'ai-downloaded';
  status?: 'analyzing' | 'complete' | 'needs-review' | 'downloading-image';
}

interface ImportResult {
  success: boolean;
  message: string;
  sku?: string;
}

export default function SmartProductManager({ onComplete }: { onComplete: () => void }) {
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isExtractingText, setIsExtractingText] = useState(false);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Generate SKU from component name
  const generateSKU = (name: string): string => {
    const cleaned = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .substring(0, 20);
    const timestamp = Date.now().toString().slice(-6);
    return `${cleaned}-${timestamp}`;
  };

  // Handle image drop/upload
  const handleImageFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      alert('Please upload image files only');
      return;
    }

    setIsAnalyzing(true);

    // Create temporary products with analyzing status
    const tempProducts: ImportProduct[] = imageFiles.map((file, index) => ({
      sku: `TEMP-${Date.now()}-${index}`,
      name: 'Analyzing...',
      category: '',
      price: 0,
      imageFile: file,
      image: URL.createObjectURL(file),
      imageSource: 'ai-recognized',
      status: 'analyzing'
    }));

    setProducts(prev => [...prev, ...tempProducts]);

    // Analyze each image with AI
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const productIndex = products.length + i;

      try {
        // Convert image to base64
        const base64Image = await fileToBase64(file);

        // Call AI recognition API
        const response = await fetch('/api/recognize-component', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Update product with AI-recognized data
          setProducts(prev => {
            const updated = [...prev];
            updated[productIndex] = {
              ...updated[productIndex],
              sku: data.sku || generateSKU(data.name || 'Component'),
              name: data.name || 'Unknown Component',
              category: data.category || 'Uncategorized',
              price: data.estimatedPrice || 0,
              status: 'complete'
            };
            return updated;
          });
        } else {
          // AI failed (quota exceeded) - Allow manual entry
          const errorData = await response.json();
          
          setProducts(prev => {
            const updated = [...prev];
            updated[productIndex] = {
              ...updated[productIndex],
              name: response.status === 429 
                ? '⚠️ AI Quota Exceeded - Please edit manually' 
                : 'Unknown - Please edit',
              sku: generateSKU(`MANUAL-${i}`),
              status: 'needs-review'
            };
            return updated;
          });

          // Show quota warning once
          if (response.status === 429 && i === 0) {
            alert('⚠️ OpenAI API quota exceeded!\n\nYour API key has run out of credits. You can:\n1. Add credits at platform.openai.com/account/billing\n2. Get a new free-tier API key\n3. Manually enter component details in the table below');
          }
        }
      } catch (error) {
        console.error('Failed to analyze image:', error);
        setProducts(prev => {
          const updated = [...prev];
          updated[productIndex] = {
            ...updated[productIndex],
            name: 'Analysis failed - Please edit manually',
            sku: generateSKU(`ERROR-${i}`),
            status: 'needs-review'
          };
          return updated;
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsAnalyzing(false);
  };

  // Handle file input (images, CSV/TSV, or screenshots with text)
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check if it's a CSV/TSV file
    if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.type === 'text/csv' || file.type === 'text/tab-separated-values') {
      await handleCSVUpload(file);
    } else if (file.type.startsWith('image/')) {
      // Ask user if it's a text document or component image
      const isTextDocument = window.confirm(
        '📸 Is this a screenshot/photo of a component list (text document)?\n\n' +
        'Click OK if it contains TEXT (like the lists you showed)\n' +
        'Click Cancel if it\'s actual COMPONENT IMAGES for AI recognition'
      );
      
      if (isTextDocument) {
        await handleTextImageUpload(file);
      } else {
        handleImageFiles(files);
      }
    } else {
      alert('Please upload image files or CSV/TSV files only');
    }
  };

  // NEW: Extract text from image using GPT-4 Vision OCR
  const handleTextImageUpload = async (file: File) => {
    setIsExtractingText(true);
    
    try {
      // Convert image to base64
      const base64Image = await fileToBase64(file);

      // Call GPT-4 Vision to extract text and convert to CSV
      const response = await fetch('/api/extract-text-to-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set the extracted CSV text in the textarea
        setCsvText(data.csvText);
        
        // Show success message
        alert(`✅ Extracted ${data.componentCount} components from image!\n\nReview the CSV data below and click "Import All Products" to continue.`);
      } else {
        const error = await response.json();
        alert(`❌ Text extraction failed: ${error.message}\n\nPlease try:\n1. A clearer image\n2. Better lighting\n3. Manual CSV entry`);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      alert('Failed to extract text from image. Please try manual entry.');
    } finally {
      setIsExtractingText(false);
    }
  };

  // Parse and handle CSV/TSV upload with AI image search
  const handleCSVUpload = async (file: File) => {
    try {
      const text = await file.text();
      const delimiter = file.name.endsWith('.tsv') ? '\t' : ',';
      const lines = text.trim().split('\n');
      
      if (lines.length === 0) {
        alert('CSV file is empty');
        return;
      }

      // Parse header
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
      const skuIndex = headers.findIndex(h => h === 'sku');
      const nameIndex = headers.findIndex(h => h === 'name');
      const categoryIndex = headers.findIndex(h => h === 'category');
      const priceIndex = headers.findIndex(h => h === 'price');
      const imageIndex = headers.findIndex(h => h === 'image');

      if (skuIndex === -1 || nameIndex === -1) {
        alert('CSV must have at least "SKU" and "Name" columns');
        return;
      }

      setIsAnalyzing(true);

      // Parse products
      const parsedProducts: ImportProduct[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        
        if (values.length < 2) continue; // Skip empty lines

        const product: ImportProduct = {
          sku: values[skuIndex] || generateSKU(values[nameIndex] || `PRODUCT-${i}`),
          name: values[nameIndex] || 'Unknown Product',
          category: categoryIndex >= 0 ? values[categoryIndex] : 'Uncategorized',
          price: priceIndex >= 0 ? parseFloat(values[priceIndex]) || 0 : 0,
          image: imageIndex >= 0 ? values[imageIndex] : undefined,
          status: 'downloading-image' as const,
          imageSource: 'ai-downloaded' as const
        };

        parsedProducts.push(product);
      }

      setProducts(prev => [...prev, ...parsedProducts]);

      // Now search and download images for each product using AI
      for (let i = 0; i < parsedProducts.length; i++) {
        const productIndex = products.length + i;
        const product = parsedProducts[i];

        // Skip if image URL already provided
        if (product.image && product.image.startsWith('http')) {
          setProducts(prev => {
            const updated = [...prev];
            updated[productIndex] = {
              ...updated[productIndex],
              status: 'complete'
            };
            return updated;
          });
          continue;
        }

        try {
          // Use AI to search and download component image
          const searchResponse = await fetch('/api/search-component-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: product.name,
              category: product.category,
              sku: product.sku
            })
          });

          if (searchResponse.ok) {
            const imageData = await searchResponse.json();
            
            setProducts(prev => {
              const updated = [...prev];
              updated[productIndex] = {
                ...updated[productIndex],
                image: imageData.imageUrl || '/logo.svg',
                status: 'complete'
              };
              return updated;
            });
          } else {
            // Use placeholder if image search fails
            setProducts(prev => {
              const updated = [...prev];
              updated[productIndex] = {
                ...updated[productIndex],
                image: '/logo.svg',
                status: 'complete'
              };
              return updated;
            });
          }
        } catch (error) {
          console.error('Failed to fetch image:', error);
          setProducts(prev => {
            const updated = [...prev];
            updated[productIndex] = {
              ...updated[productIndex],
              image: '/logo.svg',
              status: 'complete'
            };
            return updated;
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setIsAnalyzing(false);
      alert(`Successfully imported ${parsedProducts.length} products from CSV! AI is downloading images...`);

    } catch (error) {
      console.error('CSV parsing error:', error);
      alert('Failed to parse CSV file. Please check the format.');
      setIsAnalyzing(false);
    }
  };

  // Handle CSV text paste
  const handleCSVPaste = async () => {
    if (!csvText.trim()) {
      alert('Please paste CSV data first');
      return;
    }

    // Create a temporary file from pasted text
    const blob = new Blob([csvText], { type: 'text/csv' });
    const file = new File([blob], 'pasted.csv', { type: 'text/csv' });
    await handleCSVUpload(file);
    setCsvText(''); // Clear after processing
  };

  // Handle file input (images only - old function)
  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) handleImageFiles(files);
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files) handleImageFiles(files);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Remove product
  const removeProduct = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Save to database
  const handleSaveToDatabase = async () => {
    setIsProcessing(true);
    setShowResults(false);
    setResults([]);

    const importResults: ImportResult[] = [];

    for (const product of products) {
      try {
        // Upload image first if it's a file
        let imageUrl = product.image || '/logo.svg';
        
        if (product.imageFile) {
          const base64Image = await fileToBase64(product.imageFile);
          imageUrl = base64Image;
        }

        const payload = {
          sku: product.sku,
          name: product.name,
          category: product.category || 'Uncategorized',
          price: parseFloat(String(product.price || '0')) || 0,
          image: imageUrl,
        };

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          importResults.push({
            success: true,
            message: `✓ ${product.name}`,
            sku: product.sku,
          });
        } else {
          const data = await response.json();
          importResults.push({
            success: false,
            message: `✗ ${product.name}: ${data.message || 'Failed'}`,
            sku: product.sku,
          });
        }
      } catch (error) {
        importResults.push({
          success: false,
          message: `✗ ${product.name}: Network error`,
          sku: product.sku,
        });
      }
    }

    setResults(importResults);
    setShowResults(true);
    setIsProcessing(false);
    onComplete();
  };

  // Export to CSV with metadata
  const handleExportCSV = () => {
    const headers = ['SKU', 'Name', 'Category', 'Price', 'Image Source', 'Status'];
    const rows = products.map(p => [
      p.sku,
      p.name,
      p.category || '',
      p.price || '0',
      p.imageSource || 'ai-recognized',
      p.status || 'complete'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macsunny-ai-recognized-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const analyzingCount = products.filter(p => p.status === 'analyzing').length;
  const needsReviewCount = products.filter(p => p.status === 'needs-review').length;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-2 border-purple-500/50 rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
            📸 AI Image-to-Product Manager
          </h2>
          <p className="text-sm text-gray-400">Drop component images → AI recognizes them → Auto-generates CSV → Populates homepage</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-2">✨ How the AI Magic Works:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>📤 Drag & drop component images (or click to upload)</li>
              <li>🤖 AI analyzes each image and recognizes the component</li>
              <li>✏️ AI generates: SKU, Name, Category, Estimated Price</li>
              <li>👀 Review and edit if needed (inline editing)</li>
              <li>💾 Click "Save All to Database" → Products appear on homepage instantly!</li>
              <li>📥 Optional: Export as CSV with all metadata</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone for Images */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer mb-4 ${
          isDragging
            ? 'border-purple-400 bg-purple-950/20 scale-105'
            : 'border-gray-600 bg-gray-800/40 hover:border-purple-500'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`w-16 h-16 mb-4 transition-colors ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
          <p className="text-lg font-semibold mb-2">
            {isDragging ? '📦 Drop images here!' : '📸 Drag & Drop Component Images'}
          </p>
          <p className="text-sm text-gray-400">
            or click to browse • Supports JPG, PNG, WEBP • Multiple images at once
          </p>
          <p className="text-xs text-gray-500 mt-2">
            AI will automatically recognize resistors, capacitors, ICs, and more!
          </p>
        </div>
      </div>

      {/* CSV/TSV Upload Section */}
      <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 border-2 border-green-500/50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-green-400">📄 Auto-Populator + 📸 Text Extractor</h3>
            <p className="text-xs text-gray-400">Import from CSV, Excel, or extract text from images!</p>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-200">
              <p className="font-semibold mb-1">3 Ways to Import:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li><strong>📸 Screenshot/Photo:</strong> Upload image of component list → AI extracts text → Auto-converts to CSV!</li>
                <li><strong>📁 CSV/TSV File:</strong> Upload file → AI downloads images → Auto-populate</li>
                <li><strong>✍️ Manual Paste:</strong> Copy from Excel → Paste below → Import</li>
              </ol>
              <p className="mt-2 text-green-300">Required columns:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 text-[10px] overflow-x-auto">
SKU, Name, Category, Price
RES-10K, Resistor 10kΩ, Resistors, 0.50
              </pre>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            📎 Upload File (CSV/TSV or Screenshot of Component List)
          </label>
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values,image/*"
            onChange={handleFileInput}
            disabled={isExtractingText}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isExtractingText && (
            <p className="text-xs text-yellow-400 mt-2 animate-pulse">
              🤖 AI is extracting text from your image... This may take 10-20 seconds.
            </p>
          )}
        </div>

        {/* Text Paste Area */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Or paste your data here:
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            disabled={isExtractingText}
            placeholder="SKU, Name, Category, Price
RES-10K, Resistor 10kΩ, Resistors, 0.50
CAP-100U, Capacitor 100µF, Capacitors, 1.20"
            className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:opacity-50"
          />
        </div>

        {/* Import Button */}
        <button
          onClick={handleCSVPaste}
          disabled={isAnalyzing || !csvText.trim()}
          className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          🚀 Import All Products
        </button>
      </div>

      {/* Status Summary */}
      {products.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{products.length}</div>
            <div className="text-sm text-green-300">Total Images</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{analyzingCount}</div>
            <div className="text-sm text-blue-300">Analyzing...</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{needsReviewCount}</div>
            <div className="text-sm text-yellow-300">Needs Review</div>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {products.filter(p => p.status === 'complete').length}
            </div>
            <div className="text-sm text-purple-300">Ready to Save</div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {products.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden mb-6">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Image</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Price (GHS)</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {products.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-700/50">
                    <td className="px-3 py-2">
                      {product.image && (
                        <img
                          src={product.image}
                          alt=""
                          className="w-16 h-16 object-cover rounded border-2 border-gray-600"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {product.status === 'analyzing' ? (
                        <div className="flex items-center gap-2 text-blue-400">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Analyzing...</span>
                        </div>
                      ) : product.status === 'needs-review' ? (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">Review</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Ready</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={product.sku}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].sku = e.target.value;
                          setProducts(updated);
                        }}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs font-mono"
                        placeholder="SKU"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].name = e.target.value;
                          setProducts(updated);
                        }}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs"
                        placeholder="Component name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={product.category || ''}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].category = e.target.value;
                          setProducts(updated);
                        }}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs"
                        placeholder="Category"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={product.price || ''}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].price = e.target.value;
                          setProducts(updated);
                        }}
                        className="w-20 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeProduct(index)}
                        className="p-1 hover:bg-red-900/20 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {products.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={handleSaveToDatabase}
            disabled={isProcessing || analyzingCount > 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving to Database...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                💾 Save All to Database ({products.filter(p => p.status === 'complete').length} ready)
              </span>
            )}
          </button>
          <button
            onClick={handleExportCSV}
            className="px-6 py-3 bg-blue-700 hover:bg-blue-800 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={() => setProducts([])}
            className="px-6 py-3 bg-red-700 hover:bg-red-800 rounded-lg font-semibold transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Save Results</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-4 h-4" />
                {successCount} saved to homepage
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-4 h-4" />
                {failCount} failed
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  result.success
                    ? 'bg-green-900/20 text-green-300'
                    : 'bg-red-900/20 text-red-300'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="font-mono text-xs">{result.sku}</span>
                <span className="flex-1">{result.message}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-bold transition-all"
          >
            🏠 View Products on Homepage
          </button>
        </div>
      )}
    </div>
  );
}
