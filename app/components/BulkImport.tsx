'use client';
import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ImportProduct {
  sku: string;
  name: string;
  category?: string;
  price?: string | number;
  image?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  sku?: string;
}

export default function BulkImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [importData, setImportData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const parseCSV = (text: string): ImportProduct[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const products: ImportProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2) continue;

      const product: ImportProduct = {
        sku: '',
        name: '',
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header.includes('sku')) product.sku = value;
        else if (header.includes('name')) product.name = value;
        else if (header.includes('category') || header.includes('cat')) product.category = value;
        else if (header.includes('price')) product.price = value;
        else if (header.includes('image') || header.includes('img')) product.image = value;
      });

      if (product.sku && product.name) {
        products.push(product);
      }
    }

    return products;
  };

  const parseTSV = (text: string): ImportProduct[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const products: ImportProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      if (values.length < 2) continue;

      const product: ImportProduct = {
        sku: '',
        name: '',
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header.includes('sku')) product.sku = value;
        else if (header.includes('name')) product.name = value;
        else if (header.includes('category') || header.includes('cat')) product.category = value;
        else if (header.includes('price')) product.price = value;
        else if (header.includes('image') || header.includes('img')) product.image = value;
      });

      if (product.sku && product.name) {
        products.push(product);
      }
    }

    return products;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportData(text);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (!importData.trim()) {
      alert('Please paste or upload data first');
      return;
    }

    setIsProcessing(true);
    setShowResults(false);
    setResults([]);

    // Parse data (try CSV first, then TSV)
    let products = parseCSV(importData);
    if (products.length === 0) {
      products = parseTSV(importData);
    }

    if (products.length === 0) {
      alert('No valid products found. Make sure your data has SKU and Name columns.');
      setIsProcessing(false);
      return;
    }

    const importResults: ImportResult[] = [];

    // Import products one by one
    for (const product of products) {
      try {
        const payload = {
          sku: product.sku,
          name: product.name,
          category: product.category || 'Uncategorized',
          price: parseFloat(String(product.price || '0')) || 0,
          image: product.image || '/logo.svg',
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
    onImportComplete();
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-2 border-purple-500/50 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
            🚀 Auto-Populator
          </h2>
          <p className="text-sm text-gray-400">Bulk import products faster than any human</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-2">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Prepare your data in CSV or Excel (copy from Excel and paste below)</li>
              <li>Required columns: <code className="bg-blue-800 px-1 rounded">SKU</code>, <code className="bg-blue-800 px-1 rounded">Name</code></li>
              <li>Optional columns: <code className="bg-blue-800 px-1 rounded">Category</code>, <code className="bg-blue-800 px-1 rounded">Price</code>, <code className="bg-blue-800 px-1 rounded">Image</code></li>
              <li>Paste your data or upload CSV/TSV file</li>
            </ol>
            <p className="mt-2 text-xs text-gray-400">
              Example format:<br />
              <code className="bg-gray-800 px-2 py-1 rounded block mt-1 text-green-400">
                SKU, Name, Category, Price<br />
                RES-001, Resistor 10K, Resistors, 0.50<br />
                CAP-002, Capacitor 100uF, Capacitors, 1.20
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-4">
        <label className="flex items-center justify-center w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-lg cursor-pointer transition-all">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-purple-400" />
          <span className="text-sm font-medium">Upload CSV/TSV File</span>
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Text Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Or paste your data here:
        </label>
        <textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder="SKU, Name, Category, Price&#10;RES-10K, Resistor 10kΩ, Resistors, 0.50&#10;CAP-100U, Capacitor 100µF, Capacitors, 1.20"
          className="w-full h-48 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"
        />
      </div>

      {/* Import Button */}
      <div className="flex gap-3">
        <button
          onClick={handleBulkImport}
          disabled={isProcessing || !importData.trim()}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all transform hover:scale-105 disabled:transform-none"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            '🚀 Import All Products'
          )}
        </button>
        <button
          onClick={() => {
            setImportData('');
            setResults([]);
            setShowResults(false);
          }}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Import Results</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-4 h-4" />
                {successCount} succeeded
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
        </div>
      )}
    </div>
  );
}
