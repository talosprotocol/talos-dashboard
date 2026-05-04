/**
 * Talos Dashboard - Status Aggregate API Route
 *
 * Server-side endpoint that checks downstream service health.
 * Returns normalized status without exposing internal topology.
 *
 * @route GET /api/status/aggregate
 */

import { NextResponse } from "next/server";
import { DATA_SOURCE_MODE } from "@/lib/config";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";

// =============================================================================
// Types
// =============================================================================

type ServiceStatus = "online" | "offline" | "unknown";

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  latency_ms?: number;
  error_code?: string;
}

interface StatusResponse {
  services: ServiceResult[];
  aggregateStatus: "healthy" | "degraded" | "unknown";
  timestamp: number;
  code?: string;
  details?: { message?: string };
}

// =============================================================================
// Configuration
// =============================================================================

const SERVICES = [
  {
    name: "gateway",
    url: process.env.TALOS_GATEWAY_URL ?? "http://localhost:8001",
    endpoint: "/healthz",
  },
  {
    name: "audit",
    url: process.env.TALOS_AUDIT_URL ?? "http://localhost:8002",
    endpoint: "/health",
  },
  {
    name: "connector",
    url: process.env.TALOS_CONNECTOR_URL ?? "http://localhost:8082",
    endpoint: "/health",
  },
  {
    name: "ollama",
    url: process.env.TALOS_GATEWAY_URL ?? "http://localhost:8001",
    endpoint: "/health/ollama",
  },
  {
    name: "governance",
    url: process.env.TALOS_GATEWAY_URL ?? "http://localhost:8001",
    endpoint: "/health/tga",
  },
];

const SERVICE_TIMEOUT_MS = 3000;

// =============================================================================
// Service Check Logic
// =============================================================================

async function checkService(
  config: (typeof SERVICES)[number],
): Promise<ServiceResult> {
  const { name, url, endpoint } = config;

  if (!url) {
    return {
      name,
      status: "unknown",
      error_code: "TALOS_NOT_CONFIGURED",
    };
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}${endpoint}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const latency_ms = Date.now() - start;

    if (response.ok) {
      return {
        name,
        status: "online",
        latency_ms,
      };
    }

    return {
      name,
      status: "offline",
      latency_ms,
      error_code: `TALOS_HTTP_${response.status}`,
    };
  } catch (error: unknown) {
    const latency_ms = Date.now() - start;
    let error_code = "TALOS_FETCH_ERROR";

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error_code = "TALOS_TIMEOUT";
      } else if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        error_code = "TALOS_CONNECTION_REFUSED";
      }
    }

    return {
      name,
      status: "offline",
      latency_ms,
      error_code,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function computeAggregateStatus(
  results: ServiceResult[],
): "healthy" | "degraded" | "unknown" {
  if (results.length === 0) {
    return "unknown";
  }

  const onlineCount = results.filter((r) => r.status === "online").length;
  const unknownCount = results.filter((r) => r.status === "unknown").length;

  if (onlineCount === results.length) {
    return "healthy";
  }

  if (unknownCount === results.length) {
    return "unknown";
  }

  return "degraded";
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(): Promise<NextResponse<StatusResponse>> {
  // Mock mode support
  if (DATA_SOURCE_MODE === 'MOCK') {
    const results: ServiceResult[] = SERVICES.map(s => ({
        name: s.name,
        status: "online",
        latency_ms: 10
    }));
    
    return NextResponse.json({
        services: results,
        aggregateStatus: "healthy",
        timestamp: Date.now()
    });
  }

  const results = await Promise.all(SERVICES.map(checkService));

  const response: StatusResponse = {
    services: results,
    aggregateStatus: computeAggregateStatus(results),
    timestamp: Date.now(),
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
