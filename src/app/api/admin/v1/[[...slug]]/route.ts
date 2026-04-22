/**
 * Talos Dashboard - Admin API Proxy (v1)
 *
 * This catch-all route proxies requests to the Talos Gateway Admin API v1 namespace.
 * It enforces server-side authentication and session validation.
 *
 * @route /api/admin/v1/[[...slug]]
 */

import { type NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/session';
import { TALOS_GATEWAY_URL, DATA_SOURCE_MODE } from '@/lib/config';
import { MockDataSource } from '@/lib/mockData';
import { getAdminProxyPermissions } from '@/lib/auth/adminPermissions';
import { getBrokeredAdminToken } from '@/lib/auth/adminTokenBroker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
): Promise<Response> {
  const { slug } = await params;
  const path = slug ? slug.join('/') : '';
  const url = new URL(req.url);
  const queryString = url.search;
  
  // Mock mode support
  if (DATA_SOURCE_MODE === 'MOCK') {
    const mock = new MockDataSource();
    if (path === 'me') return NextResponse.json(mock.getAdminMe());
    if (path === 'budgets/scopes') return NextResponse.json({ scopes: await mock.listBudgetScopes() });
    if (path === 'keys') return NextResponse.json({ keys: await mock.listVirtualKeys() });
    if (path === 'teams') return NextResponse.json({ teams: await mock.listTeams() });
    return NextResponse.json({ error: 'Mock not implemented for this path' }, { status: 501 });
  }

  // Auth Check
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  let sessionData;
  
  if (!isDevMode) {
    sessionData = await validateRequest();
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    sessionData = { user: { id: process.env.AUTH_ADMIN_PRINCIPAL || 'dev-admin', role: 'admin' } };
  }

  // Proxy to Gateway Admin API
  try {
    const upstreamUrl = `${TALOS_GATEWAY_URL}/admin/v1/${path}${queryString}`;

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (sessionData?.user) {
      const principalId = sessionData.user.id;
      headers['X-Talos-Principal-Id'] = principalId;

      const token = await getBrokeredAdminToken({
        principal: principalId,
        permissions: getAdminProxyPermissions(req.method, path),
        sessionId: sessionData.session?.id,
      });

      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = ['POST', 'PATCH', 'PUT'].includes(req.method) 
      ? await req.text() 
      : undefined;

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
      signal: req.signal,
    });

    if (!upstream.ok) {
      console.error(`[api/admin/v1/${path}] Upstream error: ${upstream.status}`);
      const errorData = await upstream.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { 
          code: 'TALOS_ADMIN_FETCH_FAILED',
          message: `Failed to fetch from upstream: ${path}` 
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

    console.error(`[api/admin/v1/${path}] Proxy failed:`, error);
    return NextResponse.json(
      { 
        code: 'TALOS_ADMIN_CONNECTION_FAILED',
        message: 'Failed to connect to gateway' 
      },
      { status: 502 }
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
