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
  
  // If it's an admin area and NOT a public route, check authentication.
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

  if (pathname.startsWith('/api/admin')) {
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    if (mutating) {
      const origin = req.headers.get('origin');
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          const requestHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
          if (originHost !== requestHost) {
            return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
        }
      }

      const declared = Number(req.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > 16 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'Request is too large.' }, { status: 413 });
      }
    }

    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};