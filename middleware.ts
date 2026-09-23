import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminCookieName, verifyAdminSessionToken } from '@/app/lib/adminSession';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Allow these routes without authentication
  const publicAdminRoutes = new Set([
    '/admin/login',
    '/api/admin/login',
  ]);
  
  // Check if this is an admin area request
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isPublicRoute = publicAdminRoutes.has(pathname);
  
  // If it's an admin area and NOT a public route, check authentication
  if (isAdminArea && !isPublicRoute) {
    const authenticated = await verifyAdminSessionToken(req.cookies.get(adminCookieName())?.value);
    
    if (!authenticated) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};