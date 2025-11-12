import { connectDB, CategoryModel } from '../app/lib/mongodb';

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

async function seedCategories(): Promise<void> {
  try {
    console.log('🌱 Seeding categories...');
    await connectDB();
    
    for (const categoryName of defaultCategories) {
      const existing = await CategoryModel.findOne({ name: categoryName });
      if (!existing) {
        await CategoryModel.create({ name: categoryName });
        console.log(`✅ Added category: ${categoryName}`);
      } else {
        console.log(`⏭️  Category already exists: ${categoryName}`);
      }
    }
    
    console.log('🎉 Categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  }
}

seedCategories();
