import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;
const CHAT_URL = process.env.EXAMPLES_CHAT_URL ?? "http://localhost:8100";

/**
 * GET /api/examples/chat/summary
 * 
 * Proxy to secure_chat server: GET /v1/chat/summary
 */
export async function GET() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`${CHAT_URL}/v1/chat/summary`, {
            signal: controller.signal,
            cache: "no-store",
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
