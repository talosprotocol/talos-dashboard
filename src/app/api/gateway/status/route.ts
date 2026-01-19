import { NextRequest, NextResponse } from 'next/server';

/**
 * Gateway Status API Proxy
 * Proxies gateway status requests to the backend gateway service
 */
export async function GET(_request: NextRequest) {
  try {
    const gatewayUrl = process.env.TALOS_GATEWAY_URL || 'http://localhost:8000';
    
    // Try gateway status endpoint
    const response = await fetch(`${gatewayUrl}/api/gateway/status`, {
      headers: {
        'Accept': 'application/json',
      },
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
