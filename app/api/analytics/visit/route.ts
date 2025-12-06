import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

let cachedClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, page, timestamp, userAgent } = body;

    const client = await getMongoClient();
    const db = client.db('macsunny');
    const visits = db.collection('visits');

    // Get IP address from request headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    // Check if this session already exists
    const existingSession = await visits.findOne({ sessionId });

    if (existingSession) {
      // Update existing session
      await visits.updateOne(
        { sessionId },
        {
          $set: {
            lastVisit: new Date(timestamp),
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
        firstVisit: new Date(timestamp),
        lastVisit: new Date(timestamp),
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
          [`pageViews.${page}`]: 1,
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
