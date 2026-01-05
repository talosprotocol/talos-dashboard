import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 30000;
const MAX_BODY = 64 * 1024;
const CHAT_URL = process.env.EXAMPLES_CHAT_URL ?? "http://localhost:8100";

/**
 * POST /api/examples/chat/send
 * 
 * Proxy to secure_chat server: POST /v1/chat/send
 */
export async function POST(req: Request) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        // Validate content-type
        const ct = req.headers.get("content-type") ?? "";
        if (!ct.toLowerCase().startsWith("application/json")) {
            return NextResponse.json(
                { code: "TALOS_INVALID_INPUT", details: { reason: "invalid_content_type" } },
                { status: 400, headers: { "Cache-Control": "no-store" } }
            );
        }

        // Limit body size
        const body = await req.text();
        const bytes = new TextEncoder().encode(body).length;
        if (bytes > MAX_BODY) {
            return NextResponse.json(
                { code: "TALOS_INVALID_INPUT", details: { reason: "payload_too_large" } },
                { status: 413, headers: { "Cache-Control": "no-store" } }
            );
        }

        const res = await fetch(`${CHAT_URL}/v1/chat/send`, {
            method: "POST",
            signal: controller.signal,
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body,
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.startsWith("application/json")) {
            return NextResponse.json(
                { code: "TALOS_INVALID_RESPONSE", details: { reason: "non_json_response" } },
                { status: 502, headers: { "Cache-Control": "no-store" } }
            );
        }

        const data = await res.json();
        return NextResponse.json(data, {
            status: res.status,
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json(
                { code: "TALOS_TIMEOUT", details: { timeout_ms: TIMEOUT_MS } },
                { status: 504, headers: { "Cache-Control": "no-store" } }
            );
        }
        return NextResponse.json(
            { code: "TALOS_UNAVAILABLE", details: { reason: "backend_unreachable" } },
            { status: 502, headers: { "Cache-Control": "no-store" } }
        );
    } finally {
        clearTimeout(timeoutId);
    }
}
