import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/app/lib/mongodb';
import { rateAllowed, readBoundedJson, requestIp, sameOrigin } from '@/app/lib/requestSecurity';

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Unexpected request origin' }, { status: 403 });
    }
    if (!rateAllowed(req, 'analytics', 90, 60_000)) {
      return NextResponse.json({ success: false, error: 'Too many analytics requests' }, { status: 429 });
    }

    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.message }, { status: parsed.status });
    }

    const sessionId = String(parsed.value?.sessionId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128);
    const page = String(parsed.value?.page || '').trim().slice(0, 200);
    if (!sessionId || !page.startsWith('/')) {
      return NextResponse.json({ success: false, error: 'Invalid analytics event' }, { status: 400 });
    }

    const pageKey = page.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 160) || 'root';
    const now = new Date();
    const userAgent = String(req.headers.get('user-agent') || '').slice(0, 300);
    const ipAddress = requestIp(req);

    const db = await getMongoDb();
    const visits = db.collection('visits');

    // Check if this session already exists
    const existingSession = await visits.findOne({ sessionId });

    if (existingSession) {
      // Update existing session
      await visits.updateOne(
        { sessionId },
        {
          $set: {
            lastVisit: now,
          },
          $inc: { pageViews: 1 },
          $addToSet: { pages: page },
        }
      );
    } else {
      // Create new session
      await visits.insertOne({
        sessionId,
        ipAddress,
        userAgent,
        firstVisit: now,
        lastVisit: now,
        pageViews: 1,
        pages: [page],
      });
    }

    // Also track in daily stats
    const stats = db.collection('visit_stats');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await stats.updateOne(
      { date: today },
      {
        $inc: {
          totalVisits: 1,
          [`pageViews.${pageKey}`]: 1,
        },
        $addToSet: {
          uniqueVisitors: sessionId,
        },
        $set: {
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track visit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track visit' },
      { status: 500 }
    );
  }
}
