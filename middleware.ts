import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Allow these routes without authentication
  const publicAdminRoutes = [
    '/admin/login',
    '/api/admin/login',
  ];
  
  // Check if this is an admin area request
  const isAdminArea = pathname.startsWith('/admin');
  const isPublicRoute = publicAdminRoutes.some(route => pathname.startsWith(route));
  
  // If it's an admin area and NOT a public route, check authentication
  if (isAdminArea && !isPublicRoute) {
    const cookie = req.cookies.get('ms_admin')?.value;
    
    if (cookie !== '1') {
      // Not authenticated - redirect to login
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