# MacSunny product image storage

Product image binaries live in a public Vercel Blob store. MongoDB stores only the durable Blob URL/pathname and WebP metadata. Configure `BLOB_READ_WRITE_TOKEN` only in server environments. Paths use `production/products/<product-id>/...webp` and `preview/products/<product-id>/...webp`; override the prefix with `MACSUNNY_BLOB_PREFIX` when needed.

New and replacement uploads are decoded with Sharp, orientation-corrected, limited to 40 megapixels, resized to a 1600 px longest side, stripped of source metadata, and persisted as WebP. A replacement uploads and commits the new object before cleaning up the previous object. Product deletion also attempts Blob cleanup.

Before legacy migration, export the `products` collection. Preview the idempotent migration with:

```bash
node --experimental-strip-types scripts/migrate-base64-images-to-webp.ts --dry-run
```

Run without `--dry-run` only after reviewing the backup and dry-run output. Failed records retain their Base64 value and receive a failure status; successful records are updated before the legacy field is removed.
