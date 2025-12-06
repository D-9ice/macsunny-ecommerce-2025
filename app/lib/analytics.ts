/**
 * Visit Counter Service for MacSunny Electronics
 * Tracks unique visitors, page views, and analytics
 */

export interface VisitStats {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  thisWeekVisits: number;
  thisMonthVisits: number;
  pageViews: Record<string, number>;
  topPages: Array<{ page: string; views: number }>;
  lastUpdated: Date;
}

export interface VisitorSession {
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  firstVisit: Date;
  lastVisit: Date;
  pageViews: number;
  pages: string[];
}

const VISIT_STORAGE_KEY = 'macsunny_visit_stats';
const SESSION_STORAGE_KEY = 'macsunny_session_id';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Track a page visit
 */
export async function trackPageVisit(page: string): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    // Send to API endpoint
    await fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        page,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });
  } catch (error) {
    console.error('Failed to track visit:', error);
  }
}

/**
 * Get visit statistics
 */
export async function getVisitStats(): Promise<VisitStats> {
  try {
    const response = await fetch('/api/analytics/stats');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch visit stats:', error);
  }

  // Return default stats if API fails
  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    todayVisits: 0,
    thisWeekVisits: 0,
    thisMonthVisits: 0,
    pageViews: {},
    topPages: [],
    lastUpdated: new Date(),
  };
}

/**
 * Get local visit stats (localStorage fallback)
 */
export function getLocalVisitStats(): VisitStats {
  if (typeof window === 'undefined') {
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      todayVisits: 0,
      thisWeekVisits: 0,
      thisMonthVisits: 0,
      pageViews: {},
      topPages: [],
      lastUpdated: new Date(),
    };
  }

  const stored = localStorage.getItem(VISIT_STORAGE_KEY);
  if (stored) {
    try {
      const stats = JSON.parse(stored);
      stats.lastUpdated = new Date(stats.lastUpdated);
      return stats;
    } catch (error) {
      console.error('Failed to parse visit stats:', error);
    }
  }

  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    todayVisits: 0,
    thisWeekVisits: 0,
    thisMonthVisits: 0,
    pageViews: {},
    topPages: [],
    lastUpdated: new Date(),
  };
}

/**
 * Update local visit stats
 */
export function updateLocalVisitStats(page: string): void {
  if (typeof window === 'undefined') return;

  const stats = getLocalVisitStats();
  stats.totalVisits++;
  stats.todayVisits++;
  stats.pageViews[page] = (stats.pageViews[page] || 0) + 1;
  stats.lastUpdated = new Date();

  // Update top pages
  stats.topPages = Object.entries(stats.pageViews)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(stats));
}

/**
 * Format visit count for display
 */
export function formatVisitCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}
