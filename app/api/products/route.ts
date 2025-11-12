import { NextResponse } from 'next/server';
import { connectDB, ProductModel } from '@/app/lib/mongodb';

// GET all products
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    let query = {};
    if (q && q.trim()) {
      // Search in name, category, or sku
      query = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { sku: { $regex: q, $options: 'i' } },
        ],
      };
    }
    
    const products = await ProductModel.find(query).sort({ createdAt: -1 });
    
    // Return both formats for compatibility
    return NextResponse.json({ 
      success: true, 
      products,
      items: products // For admin inventory compatibility
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST new product
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { sku, name, category, price, image } = body;

    if (!sku || !name || !category || price == null) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existing = await ProductModel.findOne({ sku });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Product with this SKU already exists' },
        { status: 400 }
      );
    }

    const product = await ProductModel.create({
      sku,
      name,
      category,
      price,
      image: image || '/logo.svg',
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { sku, name, category, price, image } = body;

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU is required' },
        { status: 400 }
      );
    }

    const product = await ProductModel.findOneAndUpdate(
      { sku },
      { name, category, price, image },
      { new: true }
    );

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU is required' },
        { status: 400 }
      );
    }

    const product = await ProductModel.findOneAndDelete({ sku });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
}