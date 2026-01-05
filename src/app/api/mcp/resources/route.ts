/**
 * Talos Dashboard - MCP Resources Proxy API Route
 *
 * Proxies requests to MCP Connector's /api/mcp/resources endpoint.
 * Browser never calls connector directly - all through this same-origin route.
 *
 * @route GET /api/mcp/resources
 */

import { NextResponse } from "next/server";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";

// =============================================================================
// Types (Contract-aligned)
// =============================================================================

interface MCPResource {
  name: string;
  type: string;
  status: string;
  description?: string;
}

interface MCPResourcesResponse {
  resources: MCPResource[];
  config_loaded: boolean;
  config_hash?: string;
  timestamp: number;
  code?: string;
  details?: { service?: string; message?: string };
}

// =============================================================================
// Configuration
// =============================================================================

const CONNECTOR_URL =
  process.env.TALOS_CONNECTOR_URL ?? "http://localhost:8082";
const TIMEOUT_MS = 3000;

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(): Promise<NextResponse<MCPResourcesResponse>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${CONNECTOR_URL}/api/mcp/resources`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          resources: [],
          config_loaded: false,
          timestamp: Date.now(),
          code: "TALOS_UPSTREAM_ERROR",
          details: { service: "connector", message: `HTTP ${response.status}` },
        },
        {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    // Guard JSON parsing
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        {
          resources: [],
          config_loaded: false,
          timestamp: Date.now(),
          code: "TALOS_INVALID_RESPONSE",
          details: { service: "connector", message: "Non-JSON response" },
        },
        {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    // Normalize and validate response shape
    const normalized = normalizeResponse(data);

    return NextResponse.json(normalized, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    let code = "TALOS_UNAVAILABLE";
    let message = "Unknown error";

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        code = "TALOS_TIMEOUT";
        message = "Request timed out";
      } else if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        code = "TALOS_CONNECTION_REFUSED";
        message = "Could not connect to connector";
      }
    }

    return NextResponse.json(
      {
        resources: [],
        config_loaded: false,
        timestamp: Date.now(),
        code,
        details: { service: "connector", message },
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Response Normalization
// =============================================================================

function normalizeResponse(data: unknown): MCPResourcesResponse {
  // Type guard
  if (typeof data !== "object" || data === null) {
    return {
      resources: [],
      config_loaded: false,
      timestamp: Date.now(),
      code: "TALOS_INVALID_RESPONSE",
    };
  }

  const obj = data as Record<string, unknown>;

  // Extract and validate resources array
  const rawResources = Array.isArray(obj.resources) ? obj.resources : [];

  // Normalize each resource - redact any sensitive fields
  const resources: MCPResource[] = rawResources
    .filter(
      (r): r is Record<string, unknown> => typeof r === "object" && r !== null,
    )
    .map((r) => ({
      name: typeof r.name === "string" ? r.name : "unknown",
      type: typeof r.type === "string" ? r.type : "unknown",
      status: typeof r.status === "string" ? r.status : "unknown",
      description:
        typeof r.description === "string" ? r.description : undefined,
      // Explicitly exclude: path, filepath, url, raw_yaml, config_path, secrets
    }))
    // Deterministic ordering: sort by name ascending (ASCII)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return {
    resources,
    config_loaded:
      typeof obj.config_loaded === "boolean" ? obj.config_loaded : false,
    config_hash:
      typeof obj.config_hash === "string" ? obj.config_hash : undefined,
    timestamp: typeof obj.timestamp === "number" ? obj.timestamp : Date.now(),
  };
}
