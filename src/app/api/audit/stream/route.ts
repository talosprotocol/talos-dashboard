/**
 * Talos Dashboard - Audit Stream SSE Proxy
 *
 * Proxies SSE events from TALOS_AUDIT_URL/events to clients.
 * This is the ONLY approved path for audit event streaming.
 *
 * @route GET /api/audit/stream
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth/session";
import { getBrokeredAdminToken } from "@/lib/auth/adminTokenBroker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Required for streaming

// =============================================================================
// Configuration
// =============================================================================

const AUDIT_URL = process.env.TALOS_AUDIT_URL ?? "http://talos-audit-service:8000";

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(req: NextRequest): Promise<Response> {
  // ---------------------------------------------
  // Auth Check (bypass in dev mode)
  // ---------------------------------------------
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  let sessionData;

  if (!isDevMode) {
    sessionData = await validateRequest();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    sessionData = { user: { id: process.env.AUTH_ADMIN_PRINCIPAL || 'dev-admin', role: 'admin' } };
  }

  // ---------------------------------------------
  // Create abort controller for upstream cancellation
  // ---------------------------------------------
  const abortController = new AbortController();

  // Abort upstream when client disconnects
  req.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  try {
    // ---------------------------------------------
      const headers: HeadersInit = { 
        "Accept": "text/event-stream" 
      };

      if (sessionData?.user) {
        const principalId = sessionData.user.id;
        headers['X-Talos-Principal-Id'] = principalId;

        const token = await getBrokeredAdminToken({
          principal: principalId,
          permissions: ["audit.read"],
          sessionId: sessionData.session?.id,
        });

        headers['Authorization'] = `Bearer ${token}`;
      }

      const upstream = await fetch(`${AUDIT_URL}/events`, {
        method: "GET",
        headers,
        signal: req.signal,
      });

      // If upstream denies, forward a clean error
      if (!upstream.ok || !upstream.body) {
        console.error(`Upstream audit error: ${upstream.status}`);
        return new Response("Upstream error", { status: 502 });
      }

      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });

  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Client disconnected before upstream connected
      return new Response(null, { status: 499 }); // Client Closed Request
    }

    console.error("[audit/stream] Upstream connection failed:", error);
    return NextResponse.json(
      { code: "TALOS_AUDIT_CONNECTION_FAILED", message: "Failed to connect to audit service" },
      { status: 502 }
    );
  }
}
