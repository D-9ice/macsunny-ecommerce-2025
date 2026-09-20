import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'This legacy image endpoint has been retired. Use the Super Smart Manager WebP/document upload flow.',
    },
    { status: 410 },
  );
}
