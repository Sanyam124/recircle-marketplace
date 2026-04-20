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
  // 0. Skip Middleware for internal system requests to avoid loops
  if (request.headers.get('x-internal-request') === 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const method = request.method;

  // 1. Initial Response Object
  const response = NextResponse.next();

  // --- CSRF Protection for state-changing API requests ---
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && pathname.startsWith('/api')) {
    // Skip CSRF for Google redirect callback (Google POSTs from their own domain; has its own CSRF via g_csrf_token)
    const isGoogleRedirect = pathname === '/api/auth/google-redirect';
    
    if (!isGoogleRedirect) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      
      // Validation: Origin must match Host in production (lenient for tunnels)
      if (process.env.NODE_ENV === 'production' && origin && host) {
        try {
          const originHost = new URL(origin).hostname;
          const currentHost = host.split(':')[0];
          if (originHost !== currentHost && !originHost.endsWith('.loca.lt') && !originHost.endsWith('.ngrok-free.app')) {
            return NextResponse.json({ error: 'Security: Invalid Request Origin' }, { status: 403 });
          }
        } catch (e) {
          return NextResponse.json({ error: 'Security: Malformed Origin' }, { status: 403 });
        }
      }
    }
  }

  // --- API Rate Limiting ---
  if (pathname.startsWith('/api')) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (request as any).ip || '127.0.0.1';

    // 1. Determine Identifier (Use Token-based ID if logged in to prevent IP-only bypass)
    let identifier = ip;
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (decoded?.userId) {
          identifier = `user_${decoded.userId}`;
        }
      } catch (e) {
        // Fallback to IP if token is malformed
      }
    }
    
    // 2. Suspect/Bot Detection (Fixed to avoid false positives on legitimate routes)
    const isBotSuspect = pathname.includes('wp-admin') || 
                         pathname.includes('.env') || 
                         pathname.endsWith('/.config') || 
                         pathname.includes('/config.php') ||
                         pathname.includes('/xmlrpc.php');

    // --- Dynamic Settings Fetching (Cached for performance) ---
    // We store settings in memory for 10 seconds to avoid overloading the API
    let dynamicLimitGeneral = 200;
    let dynamicLimitAuth = 60;
    let isMaintenance = false;

    try {
        // Simple internal cache logic (global scope doesn't work well in middleware, but local for the session does)
        const configRes = await fetch(`${request.nextUrl.origin}/api/site-config`, {
            headers: { 'x-internal-request': 'true' },
            next: { revalidate: 10 } // Use Next.js fetch cache if available
        });
        
        if (configRes.ok) {
            const configData = await configRes.json();
            dynamicLimitGeneral = configData.apiRateLimitGeneral || 200;
            dynamicLimitAuth = configData.apiRateLimitAuth || 60;
            isMaintenance = configData.maintenanceMode || false;
        }
    } catch (err) {
        // Fallback to defaults
    }

    // 3. Maintenance Mode Enforcement
    // If maintenance is ON, block all API requests except from Admins or the site-config itself
    if (isMaintenance && pathname.startsWith('/api') && 
        pathname !== '/api/site-config' && 
        !pathname.includes('/api/auth/me') && 
        !pathname.includes('/api/auth/login')) {
        if (token) {
            try {
                const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                if (decoded?.role !== 'admin') {
                    return NextResponse.json({ error: 'System is under maintenance. Please try again later.' }, { status: 503 });
                }
            } catch (e) {
                return NextResponse.json({ error: 'System is under maintenance.' }, { status: 503 });
            }
        } else {
            return NextResponse.json({ error: 'System is under maintenance.' }, { status: 503 });
        }
    }
    
    // 4. Determine Dynamic Limits
    let limit = dynamicLimitGeneral; 
    if (pathname.includes('/api/auth/login') || 
        pathname.includes('/api/auth/register') || 
        pathname.includes('/api/auth/otp') || 
        pathname.includes('/api/auth/reset-password')) {
      limit = dynamicLimitAuth;
    }

    const result = rateLimit(identifier, { limit, windowMs: 60000 });

    if (!result.success || isBotSuspect) {
      const reason = isBotSuspect ? 'Malicious Path' : 'Rate Limit Exceeded';
      const label = isBotSuspect ? '\x1b[41m[SUSPECT]\x1b[0m' : '\x1b[31m[BLOCKED]\x1b[0m';
      
      console.log(`${label} ${method} ${pathname} (${reason})`);
      
      return NextResponse.json(
        { 
          error: isBotSuspect ? 'Access Denied' : 'Too many requests. Please try again later.',
          retryAfter: isBotSuspect ? 3600 : Math.ceil((result.reset - Date.now()) / 1000)
        },
        { 
          status: isBotSuspect ? 403 : 429,
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
    const redirectResponse = NextResponse.redirect(url);
    // Prevent browser from caching this redirect (e.g. caching that a page requires login even after user logs in)
    redirectResponse.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return redirectResponse;
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
  
  // New Enterprise-Grade Security Headers
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
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
