import { NextResponse } from 'next/server';
import { connectDB, CategoryModel } from '@/app/lib/mongodb';

const defaultCategories = [
  'Capacitors',
  'ICs',
  'Inductors',
  'Loudspeakers',
  'Modules',
  'Resistors',
  'Semiconductors',
  'Transistors',
];

export async function POST() {
  try {
    await connectDB();
    
    const results = [];
    
    for (const categoryName of defaultCategories) {
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
