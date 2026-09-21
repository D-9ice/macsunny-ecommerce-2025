import { NextResponse } from 'next/server';

const LIVE_MODEL = 'gpt-live-1';
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;
const MAX_SDP_BYTES = 128_000;

type RateBucket = { count: number; resetAt: number };
const globalRate = globalThis as typeof globalThis & { __macsunnyLiveRate?: Map<string, RateBucket> };
const rateBuckets = globalRate.__macsunnyLiveRate ?? new Map<string, RateBucket>();
globalRate.__macsunnyLiveRate = rateBuckets;

const LIVE_INSTRUCTIONS = `
You are the voice storefront assistant for MacSunny Electronics in Ghana.
Speak naturally, concisely, and professionally. Use English unless the visitor asks for another language.
Stop speaking immediately when the visitor interrupts, then listen.

You may answer simple conversational questions directly.
For any answer that depends on current MacSunny catalogue data, product availability, stock, prices, SKUs, specifications, equivalents/alternatives, or other business data that may change, delegate to the client backend before answering.
The client backend can search the current MacSunny product database and use the existing MacSunny GPT-5.6 Luna storefront assistant.
Never invent a product, stock status, price, specification, equivalent part, business detail, or policy.
If verified data is unavailable, say that clearly and offer the visitor the WhatsApp/contact route.

You may explain how to use the storefront, including product search, categories, cart, Direct Components Finder where available, the AI assistant, WhatsApp support, and the location finder.
Do not claim to have clicked, purchased, paid, placed an order, or changed the site on the visitor's behalf.
Payment-network names shown in the footer are labels only; do not describe them as wired payment methods unless the storefront backend explicitly confirms otherwise.

Keep spoken answers short by default. Ask a brief clarification when needed.
The application controls the first welcome greeting separately.
`.trim();

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

function rateAllowed(request: Request) {
  const now = Date.now();
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const current = rateBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
  }
  if (!rateAllowed(request)) {
    return NextResponse.json({ success: false, message: 'Too many voice-session requests. Please wait a moment.' }, { status: 429 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ success: false, message: 'Voice assistant is not configured.' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/sdp')) {
    return NextResponse.json({ success: false, message: 'An SDP offer is required.' }, { status: 415 });
  }

  const sdp = await request.text();
  if (!sdp.trim() || new TextEncoder().encode(sdp).byteLength > MAX_SDP_BYTES) {
    return NextResponse.json({ success: false, message: 'Invalid SDP offer.' }, { status: 400 });
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/live/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          model: LIVE_MODEL,
          audio: { output: { voice: 'marin' } },
          delegation: { type: 'client' },
          instructions: LIVE_INSTRUCTIONS,
          store: false,
        },
        transport: {
          type: 'webrtc',
          sdp,
        },
      }),
      cache: 'no-store',
    });

    const payload = await openaiResponse.json().catch(() => null);
    if (!openaiResponse.ok) {
      console.error('live.session.create.failed', {
        status: openaiResponse.status,
        code: payload?.error?.code,
        type: payload?.error?.type,
      });
      return NextResponse.json(
        { success: false, message: 'Voice session could not be started.' },
        { status: openaiResponse.status >= 400 && openaiResponse.status < 600 ? openaiResponse.status : 502 },
      );
    }

    if (!payload?.transport?.sdp || !payload?.session?.id) {
      return NextResponse.json({ success: false, message: 'Voice session response was incomplete.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      session: { id: payload.session.id },
      transport: { type: 'webrtc', sdp: payload.transport.sdp },
      model: LIVE_MODEL,
    });
  } catch (error) {
    console.error('live.session.create.error', { error });
    return NextResponse.json({ success: false, message: 'Voice service is temporarily unavailable.' }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: LIVE_MODEL,
  });
}
