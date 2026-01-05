import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;
const AIOPS_URL = process.env.TALOS_AIOPS_URL ?? "http://localhost:8200";

/**
 * GET /api/examples/devops/status
 * Proxy to {AIOPS_URL}/v1/status
 */
export async function GET(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${AIOPS_URL}/v1/status`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await res.json();
    // Validation: Ensure status field exists
    if (!data.status) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_UPSTREAM_RESPONSE",
          details: { reason: "missing_status_field" },
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
