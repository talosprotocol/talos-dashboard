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
  if (isPublicRoute) {
    if (isValid && pathname === '/login') {
      return NextResponse.redirect(new URL('/console', request.url));
    }
    return NextResponse.next();
  }

  // Protected Routes
  if (!isValid) {
      // Redirect unauthenticated users to login
      if (pathname.startsWith('/api')) {
           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
  }

  // Valid Session: Mutate REQUEST headers for downstream components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-talos-auth', '1');

  return NextResponse.next({
      request: {
          headers: requestHeaders,
      },
  });
}

export const config = {
  // Match everything except static assets
  matcher: ['/((?!_next/static|_next/image).*)'],
};
