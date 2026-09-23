import { NextResponse } from 'next/server';
import { connectDB, CategoryModel } from '@/app/lib/mongodb';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import { sameOrigin } from '@/app/lib/requestSecurity';

const defaultCategories = [
  'Capacitors',
  'ICs',
  'Inductors',
  'Loudspeakers',
  'Modules',
  'MOSFETs',
  'Resistors',
  'Semiconductors',
  'Transistors',
];

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (!sameOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
    }
    await connectDB();
    const requested = new URL(request.url).searchParams.get('category');
    const requestedCategory = requested
      ? defaultCategories.find((category) => category.toLowerCase() === requested.trim().toLowerCase())
      : null;
    if (requested && !requestedCategory) {
      return NextResponse.json({ success: false, message: 'Unsupported seed category' }, { status: 400 });
    }
    const categoriesToSeed = requestedCategory ? [requestedCategory] : defaultCategories;
    const results = [];
    
    for (const categoryName of categoriesToSeed) {
      const existing = await CategoryModel.findOne({ name: categoryName });
      if (!existing) {
        await CategoryModel.create({ name: categoryName });
        results.push({ category: categoryName, status: 'added' });
      } else {
        results.push({ category: categoryName, status: 'exists' });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Categories seeded successfully',
      results
    });
  } catch (error) {
    console.error('Failed to seed categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed categories' },
      { status: 500 }
    );
  }
}
