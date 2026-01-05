/**
 * Talos Dashboard - Status Aggregate API Route
 *
 * Server-side endpoint that checks downstream service health.
 * Returns normalized status without exposing internal topology.
 *
 * @route GET /api/status/aggregate
 */

import { NextResponse } from "next/server";

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

/**
 * Service configuration from environment variables.
 * Defaults are for local development ONLY - see .env.example
 */
const SERVICES = [
  {
    name: "gateway",
    url: process.env.TALOS_GATEWAY_URL ?? "http://localhost:8080",
    endpoint: "/api/gateway/status",
  },
  {
    name: "audit",
    url: process.env.TALOS_AUDIT_URL ?? "http://localhost:8081",
    endpoint: "/health",
  },
  {
    name: "connector",
    url: process.env.TALOS_CONNECTOR_URL ?? "http://localhost:8082",
    endpoint: "/health",
  },
  {
    name: "ollama",
    url: process.env.OLLAMA_URL ?? "http://localhost:11434",
    endpoint: "/api/tags",
  },
];

// Per-service timeout (ms) - prevents hanging on slow/dead services
const SERVICE_TIMEOUT_MS = 3000;

// =============================================================================
// Service Check Logic
// =============================================================================

async function checkService(
  config: (typeof SERVICES)[number],
): Promise<ServiceResult> {
  const { name, url, endpoint } = config;

  // Handle misconfigured services
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

    // Non-2xx response
    return {
      name,
      status: "offline",
      latency_ms,
      error_code: `TALOS_HTTP_${response.status}`,
    };
  } catch (error: unknown) {
    const latency_ms = Date.now() - start;

    // Determine error type with taxonomy-aligned codes
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

/**
 * Compute aggregate status from individual results.
 *
 * Rules:
 * - healthy: all online
 * - degraded: at least one online and at least one offline
 * - unknown: none online, or configuration missing for all
 */
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

  // At least one online and at least one not online = degraded
  // All offline = degraded (not unknown, because we know they're offline)
  return "degraded";
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(): Promise<NextResponse<StatusResponse>> {
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
