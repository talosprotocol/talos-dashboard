/**
 * Talos Dashboard - Audit Events Proxy
 *
 * Proxies audit event list requests from browser to audit service.
 * This is the ONLY approved path for paginated audit event fetching.
 *
 * @route GET /api/events
 */

import { type NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth/session";
import { DATA_SOURCE_MODE, TALOS_AUDIT_URL } from "@/lib/config";
import { MockDataSource } from "@/lib/mockData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(req: NextRequest): Promise<Response> {
  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const limitStr = searchParams.get("limit") || "50";
  const limit = parseInt(limitStr, 10);
  const before = searchParams.get("before");

  // Server-side mode switching
  if (DATA_SOURCE_MODE === "MOCK") {
    const mock = new MockDataSource();
    const result = mock.listEvents({ limit, before });
    return NextResponse.json(result);
  }

  // HTTP mode - validate and proxy
  const isDevMode =
    process.env.NODE_ENV === "development" || process.env.DEV_MODE === "true";

  if (!isDevMode) {
    const sessionData = await validateRequest();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
  }

  // ---------------------------------------------
  // Parse and Validate Query Parameters
  // ---------------------------------------------
  // Validate limit (must be numeric, capped)
  if (isNaN(limit) || limit < 1 || limit > 200) {
    return NextResponse.json(
      { error: "Invalid limit: must be between 1 and 200" },
      { status: 400 },
    );
  }

  // Validate cursor format if present
  // const before = searchParams.get('before'); // Already parsed above
  if (before) {
    // Basic cursor format check (UUIDv7 format: timestamp_eventid)
    if (!/^[0-9a-f]{8,}_[0-9a-f-]+$/i.test(before)) {
      return NextResponse.json(
        { error: "Invalid cursor format" },
        { status: 400 },
      );
    }
  }

  // Reject unknown query params (security: prevent accidental open proxy)
  const allowedParams = new Set(["limit", "before"]);
  for (const key of searchParams.keys()) {
    if (!allowedParams.has(key)) {
      return NextResponse.json(
        { error: `Unknown query parameter: ${key}` },
        { status: 400 },
      );
    }
  }

  // ---------------------------------------------
  // Proxy to Audit Service with Identity Forwarding
  // ---------------------------------------------
  try {
    // SECURITY: Use /api/events (not /events which is SSE)
    const upstreamUrl = new URL(`${TALOS_AUDIT_URL}/api/events`);
    upstreamUrl.searchParams.set("limit", limit.toString());
    if (before) {
      upstreamUrl.searchParams.set("before", before);
    }

    // SECURITY: Derive identity from server session, not client headers
    // In production, this would generate signed principal from session
    const upstreamHeaders: HeadersInit = {
      Accept: "application/json",
    };

    // TODO: In production, derive these from session:
    // const session = await getServerSession();
    // upstreamHeaders['Authorization'] = `Bearer ${session.accessToken}`;
    // upstreamHeaders['X-Talos-Principal'] = generateSignedPrincipal(session.user);

    // For now in dev mode, we can allow unauthenticated calls to audit service
    // but this must be gated in production

    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: upstreamHeaders,
      signal: req.signal, // Propagate abort
    });

    if (!upstream.ok) {
      console.error(`[api/events] Upstream error: ${upstream.status}`);
      return NextResponse.json(
        {
          code: "TALOS_AUDIT_FETCH_FAILED",
          message: "Failed to fetch events from audit service",
        },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();

    // Return with cache prevention headers
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 499 }); // Client Closed Request
    }

    console.error("[api/events] Proxy failed:", error);
    return NextResponse.json(
      {
        code: "TALOS_AUDIT_CONNECTION_FAILED",
        message: "Failed to connect to audit service",
      },
      { status: 502 },
    );
  }
}
