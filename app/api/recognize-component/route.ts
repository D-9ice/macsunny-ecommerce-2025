import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'This legacy image endpoint has been retired. Use Super Smart Manager binary WebP upload.',
  }, { status: 410 });
}
