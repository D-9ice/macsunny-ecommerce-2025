import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const client = await getMongoClient();
    const db = client.db('macsunny');
    const stats = db.collection('visit_stats');
    const visits = db.collection('visits');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get total visits from all time
    const allTimeStats = await stats.find({}).toArray();
    const totalVisits = allTimeStats.reduce((sum: number, day: any) => sum + (day.totalVisits || 0), 0);

    // Get unique visitors (count unique sessions)
    const uniqueVisitors = await visits.countDocuments();

    // Get today's visits
    const todayStats = await stats.findOne({ date: today });
    const todayVisits = todayStats?.totalVisits || 0;

    // Get this week's visits
    const weekStats = await stats.find({ date: { $gte: weekAgo } }).toArray();
    const thisWeekVisits = weekStats.reduce((sum: number, day: any) => sum + (day.totalVisits || 0), 0);

    // Get this month's visits
    const monthStats = await stats.find({ date: { $gte: monthAgo } }).toArray();
    const thisMonthVisits = monthStats.reduce((sum: number, day: any) => sum + (day.totalVisits || 0), 0);

    // Aggregate page views
    const pageViews: Record<string, number> = {};
    allTimeStats.forEach((day: any) => {
      if (day.pageViews) {
        Object.entries(day.pageViews).forEach(([page, count]) => {
          pageViews[page] = (pageViews[page] || 0) + (count as number);
        });
      }
    });

    // Get top pages
    const topPages = Object.entries(pageViews)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return NextResponse.json({
      totalVisits,
      uniqueVisitors,
      todayVisits,
      thisWeekVisits,
      thisMonthVisits,
      pageViews,
      topPages,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Failed to fetch visit stats:', error);
    return NextResponse.json(
      {
        totalVisits: 0,
        uniqueVisitors: 0,
        todayVisits: 0,
        thisWeekVisits: 0,
        thisMonthVisits: 0,
        pageViews: {},
        topPages: [],
        lastUpdated: new Date(),
      },
      { status: 500 }
    );
  }
}
