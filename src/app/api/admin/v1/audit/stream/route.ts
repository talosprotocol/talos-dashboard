/**
 * Talos Dashboard - Consolidated Audit Stream SSE Proxy
 *
 * Proxies SSE events from TALOS_AUDIT_URL/events to clients via Admin namespace.
 *
 * @route GET /api/admin/v1/audit/stream
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth/session";
import { TALOS_AUDIT_URL } from "@/lib/config";
import { getBrokeredAdminToken } from "@/lib/auth/adminTokenBroker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
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

  try {
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

      const upstream = await fetch(`${TALOS_AUDIT_URL}/events`, {
        method: "GET",
        headers,
        signal: req.signal,
      });

      if (!upstream.ok || !upstream.body) {
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
      return new Response(null, { status: 499 });
    }

    console.error("[api/admin/v1/audit/stream] Proxy failed:", error);
    return NextResponse.json(
      { code: "TALOS_AUDIT_CONNECTION_FAILED", message: "Failed to connect to audit service" },
      { status: 502 }
    );
  }
}
