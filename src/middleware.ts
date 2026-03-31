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
  const method = request.method;

  // 1. Initial Response Object
  let response = NextResponse.next();

  // --- CSRF Protection for state-changing API requests ---
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Validation: Origin must match Host in production
    if (process.env.NODE_ENV === 'production' && origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: 'Security: Invalid Request Origin' }, { status: 403 });
        }
      } catch (e) {
        return NextResponse.json({ error: 'Security: Malformed Origin' }, { status: 403 });
      }
    }
  }

  // --- API Rate Limiting ---
  if (pathname.startsWith('/api')) {
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    
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
    
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());
  }


  // --- Page Protections ---
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/auth' && token) {
    const url = request.nextUrl.clone();
    url.pathname = '/explore';
    return NextResponse.redirect(url);
  }

  // --- Global Security Headers ---
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$).*)',
  ],
};
