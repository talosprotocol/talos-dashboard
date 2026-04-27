import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/session';
import { TALOS_GATEWAY_URL } from '@/lib/config';
import { getBrokeredAdminToken } from '@/lib/auth/adminTokenBroker';

/**
 * Gateway Status API Proxy
 * Proxies gateway status requests to the backend gateway service
 */
export async function GET(_req: NextRequest) {
  try {
    const gatewayUrl = TALOS_GATEWAY_URL || 'http://localhost:8001';
    
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

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (sessionData?.user) {
      const principalId = sessionData.user.id;
      headers['X-Talos-Principal-Id'] = principalId;

      if (!isDevMode) {
        const token = await getBrokeredAdminToken({
          principal: principalId,
          permissions: ["llm.read"],
          sessionId: sessionData.session?.id,
        });

        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Try gateway status endpoint
    const response = await fetch(`${gatewayUrl}/api/gateway/status`, {
      headers,
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      // If status endpoint doesn't exist, try healthz
      const healthResponse = await fetch(`${gatewayUrl}/healthz`, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        
        // Transform health response to gateway status format
        return NextResponse.json({
          schema_version: '1',
          gateway_instance_id: 'unknown',
          status_seq: 0,
          state: healthData.status === 'ok' ? 'RUNNING' : 'DEGRADED',
          version: '0.1.0',
          uptime_seconds: 0,
          requests_processed: 0,
          tenants: 0,
          cache: {
            capability_cache_size: 0,
            hits: 0,
            misses: 0,
            evictions: 0,
          },
          sessions: {
            active_sessions: 0,
            replay_rejections_1h: 0,
          },
        });
      }

      // If both fail, return degraded status
      return NextResponse.json({
        schema_version: '1',
        gateway_instance_id: 'unknown',
        status_seq: 0,
        state: 'DEGRADED',
        version: '0.1.0',
        uptime_seconds: 0,
        requests_processed: 0,
        tenants: 0,
        cache: {
          capability_cache_size: 0,
          hits: 0,
          misses: 0,
          evictions: 0,
        },
        sessions: {
          active_sessions: 0,
          replay_rejections_1h: 0,
        },
      }, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Gateway status proxy error:', error);
    
    // Return degraded status on error
    return NextResponse.json({
      schema_version: '1',
      gateway_instance_id: 'unknown',
      status_seq: 0,
      state: 'STOPPED',
      version: '0.1.0',
      uptime_seconds: 0,
      requests_processed: 0,
      tenants: 0,
      cache: {
        capability_cache_size: 0,
        hits: 0,
        misses: 0,
        evictions: 0,
      },
      sessions: {
        active_sessions: 0,
        replay_rejections_1h: 0,
      },
    }, { status: 503 });
  }
}
