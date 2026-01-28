/**
 * Talos Dashboard - Admin Me Proxy
 *
 * Proxies user profile requests to gateway admin API.
 * SECURITY: Derives identity from server session, not client headers.
 *
 * @route GET /api/admin/me
 */

import { type NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/session';
import { DATA_SOURCE_MODE, TALOS_GATEWAY_URL } from '@/lib/config';
import { MockDataSource } from '@/lib/mockData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response> {
  // Server-side mode switching
  if (DATA_SOURCE_MODE === 'MOCK') {
    const mock = new MockDataSource();
    return NextResponse.json(mock.getAdminMe());
  }

  // HTTP mode: proxy to gateway
  // ---------------------------------------------
  // Auth Check - REQUIRED
  // ---------------------------------------------
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  
  let sessionData;
  
  if (!isDevMode) {
    sessionData = await validateRequest();
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
     sessionData = { user: { id: 'dev-user', role: 'admin' } };
  }

  // ---------------------------------------------
  // Proxy to Gateway Admin API
  // ---------------------------------------------
  try {
    const upstreamUrl = `${TALOS_GATEWAY_URL}/admin/v1/me`;

    // SECURITY: In production, derive these from server session
    const headers: HeadersInit = {
        'Accept': 'application/json'
    };

    if (sessionData?.user) {
        headers['X-Talos-Principal'] = sessionData.user.id;
        headers['X-Talos-Role'] = sessionData.user.role || 'user';
    }
    
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers,
      signal: req.signal,
    });

    if (!upstream.ok) {
      console.error(`[api/admin/me] Upstream error: ${upstream.status}`);
      return NextResponse.json(
        { 
          code: 'TALOS_ADMIN_FETCH_FAILED',
          message: 'Failed to fetch user profile' 
        },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }

    console.error('[api/admin/me] Proxy failed:', error);
    return NextResponse.json(
      { 
        code: 'TALOS_ADMIN_CONNECTION_FAILED',
        message: 'Failed to connect to gateway' 
      },
      { status: 502 }
    );
  }
}
