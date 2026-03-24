import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add the paths you want to protect here
const protectedPaths = [
  '/profile',
  '/orders',
  '/wishlist',
  '/chat',
  '/board',
  '/admin',
  '/verifier-dashboard',
  '/products/create',
  '/services/create',
  '/settings'
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // If path is protected and there is no token, redirect to auth
  if (isProtectedPath && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Prevent logged-in users from seeing the auth page
  if (pathname === '/auth' && token) {
    const url = request.nextUrl.clone();
    url.pathname = '/explore';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo (any static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
