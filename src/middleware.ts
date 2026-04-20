import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCookieNames, verifyCookieSignature } from '@/lib/auth/edge-session';

const SECRET_KEY = process.env.AUTH_COOKIE_HMAC_SECRET || 'dev-secret-change-me';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Strict Allowlist
  const isPublicRoute = 
    pathname === '/login' ||
    pathname.startsWith('/api/auth/webauthn/') ||
    pathname === '/api/auth/dev-login' ||
    pathname === '/api/health' ||
    pathname === '/api/debug/reset' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next/') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/);

  // 2. Get Cookie
  const cookieNames = getCookieNames();
  let cookie;
  for (const name of cookieNames) {
      if (request.cookies.has(name)) {
          cookie = request.cookies.get(name);
          break;
      }
  }

  // 3. Verify Cookie
  let isValid = false;
  if (cookie?.value) {
    isValid = await verifyCookieSignature(cookie.value, SECRET_KEY);
  }

  // 4. Handle Routing
  let response: NextResponse;

  if (isPublicRoute) {
    if (isValid && pathname === '/login') {
      response = NextResponse.redirect(new URL('/console', request.url));
    } else {
      response = NextResponse.next();
    }
  } else if (!isValid) {
    // Protected Routes: Redirect unauthenticated users to login
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    response = NextResponse.redirect(loginUrl);
  } else {
    // Valid Session: Mutate REQUEST headers for downstream components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-talos-auth', '1');

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Strict CSP Header
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocations=()');

  return response;
}

export const config = {
  // Match everything except static assets
  matcher: ['/((?!_next/static|_next/image).*)'],
};
