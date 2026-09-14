import mongoose from 'mongoose';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const dryRun = process.argv.includes('--dry-run');
const batchSize = Math.min(50, Math.max(1, Number(process.env.MIGRATION_BATCH_SIZE || 10)));
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');
if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required');

async function main() {
  await mongoose.connect(uri!, { dbName: process.env.MONGODB_DB || 'macsunny' });
  const products = mongoose.connection.collection('products');
  const query = { image: { $regex: '^data:image' }, imageMigrationStatus: { $ne: 'migrated' } };
  const cursor = products.find(query).batchSize(batchSize);
  let checked = 0, migrated = 0, failed = 0;
  for await (const product of cursor) {
    checked++;
    const sku = String(product.sku || product._id);
    try {
      const match = String(product.image).match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
      if (!match) throw new Error('Invalid data URL');
      const input = Buffer.from(match[1], 'base64');
      const output = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      if (dryRun) { console.log(`[dry-run] ${sku}: ${input.length} -> ${output.info.size} bytes`); continue; }
      const environment = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
      const pathname = `${process.env.MACSUNNY_BLOB_PREFIX || `${environment}/products`}/${product._id}/${Date.now()}-${crypto.randomUUID().slice(0, 12)}.webp`;
      const blob = await put(pathname, output.data, { access: 'public', contentType: 'image/webp', addRandomSuffix: false });
      await products.updateOne({ _id: product._id, image: product.image }, { $set: { imageUrl: blob.url, imageStorageKey: blob.pathname, imageFormat: 'webp', imageMimeType: 'image/webp', imageWidth: output.info.width, imageHeight: output.info.height, imageBytes: output.info.size, imageUpdatedAt: new Date(), imageMigrationStatus: 'migrated', imageMigrationError: null, imageMigratedAt: new Date() }, $unset: { image: '' } });
      migrated++; console.log(`migrated ${sku}`);
    } catch (error) {
      failed++; const message = error instanceof Error ? error.message : String(error);
      if (!dryRun) await products.updateOne({ _id: product._id }, { $set: { imageMigrationStatus: 'failed', imageMigrationError: message.slice(0, 500) } });
      console.error(`failed ${sku}: ${message}`);
    }
  }
  console.log(JSON.stringify({ dryRun, checked, migrated, failed }));
  await mongoose.disconnect();
}

main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
