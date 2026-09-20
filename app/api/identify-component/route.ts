import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy image endpoint has been retired. Use the Super Smart Manager WebP upload flow.',
    },
    { status: 410 },
  );
}
