/**
 * Talos Dashboard - Consolidated Status Endpoint
 *
 * Server-side service health checks with diagnostics.
 * SECURITY: Requires session to prevent unauthenticated network scanning.
 *
 * @route GET /api/status
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  DATA_SOURCE_MODE,
  TALOS_AUDIT_URL,
  TALOS_CHAT_URL,
  TALOS_CONNECTOR_URL,
  TALOS_GATEWAY_URL,
} from '@/lib/config';
import { MockDataSource } from '@/lib/mockData';
import { validateRequest } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Service URLs
const GATEWAY_URL = TALOS_GATEWAY_URL;
const AUDIT_URL = TALOS_AUDIT_URL;
const CONNECTOR_URL = TALOS_CONNECTOR_URL;
const CHAT_URL = TALOS_CHAT_URL;

type ServiceState = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

interface ServiceStatus {
  state: ServiceState;
  latency_ms?: number;
  error_code?: string;
  error_message?: string;
}

interface StatusResponse {
  services: {
    gateway: ServiceStatus;
    audit: ServiceStatus;
    connector: ServiceStatus;
    chat: ServiceStatus;
  };
  timestamp: string;
}

async function checkService(
  url: string,
  healthPath: string,
  timeoutMs: number = 2000,
): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${url}${healthPath}`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency_ms = Date.now() - startTime;
    
    if (response.ok) {
      return {
        state: 'ONLINE',
        latency_ms,
      };
    }
    
    return {
      state: 'DEGRADED',
      latency_ms,
      error_code: `HTTP_${response.status}`,
      error_message: response.statusText,
    };
    
  } catch (error) {
    const latency_ms = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          state: 'OFFLINE',
          latency_ms,
          error_code: 'TIMEOUT',
          error_message: `Service did not respond within ${timeoutMs}ms`,
        };
      }
      
      return {
        state: 'OFFLINE',
        latency_ms,
        error_code: 'CONN_REFUSED',
        error_message: error.message,
      };
    }
    
    return {
      state: 'OFFLINE',
      latency_ms,
      error_code: 'UNKNOWN',
      error_message: 'Unknown error',
    };
  }
}

export async function GET(_req: NextRequest): Promise<Response> {
  // Server-side mode switching
  if (DATA_SOURCE_MODE === 'MOCK') {
    const mock = new MockDataSource();
    return NextResponse.json(mock.getStatus(), {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
    });
  }

  // HTTP mode: check real services
  // ---------------------------------------------
  // Auth Check - REQUIRED (prevent network scanning)
  // ---------------------------------------------
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  
  if (!isDevMode) {
    const sessionData = await validateRequest();
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ---------------------------------------------
  // Check All Services in Parallel
  // ---------------------------------------------
  const [gateway, audit, connector, chat] = await Promise.all([
    checkService(GATEWAY_URL, '/health/ready'),
    checkService(AUDIT_URL, '/health'),
    checkService(CONNECTOR_URL, '/health'),
    checkService(CHAT_URL, '/health'),
  ]);

  const response: StatusResponse = {
    services: {
      gateway,
      audit,
      connector,
      chat,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  });
}
