import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 30000;
const CHAT_URL = process.env.TALOS_CHAT_URL ?? "http://localhost:8100";

const FeedbackRequestSchema = z.object({
  message_id: z.string(),
  rating: z.enum(["thumbs_up", "thumbs_down"]),
  reason: z.string().optional(),
});

/**
 * POST /api/examples/chat/feedback
 * Proxy to {CHAT_URL}/v1/chat/feedback
 */
export async function POST(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const bodyText = await req.text();
    let bodyJson;
    try {
      bodyJson = JSON.parse(bodyText);
      FeedbackRequestSchema.parse(bodyJson);
    } catch (e) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_INPUT",
          details: { reason: "schema_validation_failed" },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const res = await fetch(`${CHAT_URL}/v1/chat/feedback`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: bodyText,
      cache: "no-store",
    });

    const data = await res.json();
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
