import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;
const AIOPS_URL = process.env.TALOS_AIOPS_URL ?? "http://localhost:8200";

// --- Schema Validation ---
// Logs should be an array of strings or log objects

/**
 * GET /api/examples/devops/logs
 * Proxy to {AIOPS_URL}/v1/logs?limit=200
 */
export async function GET(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ?? "200";

  try {
    const res = await fetch(`${AIOPS_URL}/v1/logs?limit=${limit}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await res.json();
    // Validation: Ensure it is an array
    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_UPSTREAM_RESPONSE",
          details: { reason: "logs_must_be_array" },
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { code: "TALOS_TIMEOUT", details: { timeout_ms: TIMEOUT_MS } },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { code: "TALOS_UNAVAILABLE", details: { reason: "backend_unreachable" } },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
