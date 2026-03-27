import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from './lib/ratelimiter';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // --- API Rate Limiting ---
  if (pathname.startsWith('/api')) {
    // Next.js Middleware provides request.ip, but we cast to any to avoid TS errors in some environments
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Default: 60 requests per minute
    // Stricter for Auth: 5 requests per minute
    let limit = 60;
    if (pathname.includes('/api/auth/login') || pathname.includes('/api/auth/register') || pathname.includes('/api/auth/otp')) {
      limit = 10; 
    }

    const result = rateLimit(ip, { limit, windowMs: 60000 });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString()
          }
        }
      );
    }
    
    // Continue with headers for success
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());
    return response;
  }


  // --- Page Protections ---
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo (any static assets like .png, .jpg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$).*)',
  ],
};
