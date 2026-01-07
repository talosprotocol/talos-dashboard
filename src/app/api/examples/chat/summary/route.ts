import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15000;
const CHAT_URL = process.env.TALOS_CHAT_URL ?? "http://localhost:8100";

/**
 * GET /api/examples/chat/summary
 * Proxy to {CHAT_URL}/v1/chat/summary
 */
export async function GET(_req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${CHAT_URL}/v1/chat/summary`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await res.json();
    // Validation: Ensure summary fields exist
    if (!data.message_count || !data.session_id) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_UPSTREAM_RESPONSE",
          details: { reason: "missing_summary_fields" },
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
