import { NextResponse } from 'next/server';
import { connectDB, ProductModel, CategoryModel } from '@/app/lib/mongodb';

// GET all unique categories from both Category collection and Products
export async function GET() {
  try {
    await connectDB();
    
    // Get categories from Category collection
    const categoryDocs = await CategoryModel.find({}).select('name');
    const categoriesFromCollection = categoryDocs.map((doc: any) => doc.name);
    
    // Get unique categories from products
    const categoriesFromProducts = await ProductModel.distinct('category');
    
    // Combine both sources and remove duplicates
    const allCategories = [
      ...categoriesFromCollection,
      ...categoriesFromProducts
    ];
    
    // Filter out empty/null categories, remove duplicates, and sort
    const validCategories = [...new Set(allCategories)]
      .filter((cat: string) => cat && cat.trim())
      .sort((a: string, b: string) => a.localeCompare(b));

    return NextResponse.json({ 
      success: true, 
      categories: validCategories 
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories', categories: [] },
      { status: 500 }
    );
  }
}

// POST - Add a new category
export async function POST(request: Request) {
  try {
    await connectDB();
    const { name } = await request.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      );
    }
    
    // Check if category already exists
    const existing = await CategoryModel.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Category already exists' },
        { status: 400 }
      );
    }
    
    // Create new category
    const category = await CategoryModel.create({ name: name.trim() });
    
    return NextResponse.json({ 
      success: true, 
      category,
      message: 'Category added successfully'
    });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a category
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      );
    }
    
    await CategoryModel.findOneAndDelete({ name });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
