import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 60000;
const MAX_BODY = 64 * 1024; // 64KB
const CHAT_URL = process.env.TALOS_CHAT_URL ?? "http://localhost:8100";

// --- Schema Validation ---

const SendRequestSchema = z.object({
  content: z.string().min(1).max(4096),
});

const SendResponseSchema = z.object({
  response: z.string(),
  message_id: z.string(),
  conversation_id: z.string(),
  secure: z.boolean(),
});

/**
 * POST /api/examples/chat/send
 * Proxy to {CHAT_URL}/v1/chat/send
 */
export async function POST(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 1. Content-Type Check
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().startsWith("application/json")) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_INPUT",
          details: { reason: "invalid_content_type" },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2. Body Size Limit
    const bodyText = await req.text();
    const bytes = new TextEncoder().encode(bodyText).length;
    if (bytes > MAX_BODY) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_INPUT",
          details: { reason: "payload_too_large" },
        },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 3. Schema Validation (Request)
    let bodyJson;
    try {
      bodyJson = JSON.parse(bodyText);
      SendRequestSchema.parse(bodyJson);
    } catch (_e) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_INPUT",
          details: { reason: "schema_validation_failed" },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Inject session_id for Demo Mode
    // The simplified UI sends { content } but backend expects session-aware payload
    const upstreamBody = {
        ...bodyJson, // { content: "..." }
        session_id: "demo-session-v1" 
    };

    // 4. Upstream Request
    const res = await fetch(`${CHAT_URL}/v1/chat/send`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
    });

    // 5. Upstream Validation
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("application/json")) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_UPSTREAM_RESPONSE",
          details: { reason: "non_json_response" },
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = await res.json();

    // 6. Schema Validation (Response)
    try {
      if (res.ok) {
        SendResponseSchema.parse(data);
      }
    } catch (_e) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_UPSTREAM_RESPONSE",
          details: { reason: "schema_mismatch" },
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
