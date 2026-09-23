import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, CategoryModel } from '@/app/lib/mongodb';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

const isAdmin = async () => await isAdminAuthenticated();

// Category Manager is the single source of truth.
export async function GET() {
  try {
    await connectDB();
    
    const categoryDocs = await CategoryModel.find({}).select('name');
    const validCategories = [...new Set(categoryDocs.map((doc: { name?: string }) => String(doc.name || '').trim()))]
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
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await CategoryModel.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
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
  if (!(await isAdmin())) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
