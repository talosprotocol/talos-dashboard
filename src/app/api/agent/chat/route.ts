import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AGENT_URL = process.env.TALOS_CHAT_URL || "http://talos-chat-agent:8100";

export async function POST(req: NextRequest) {
    // 1. Auth Check
    const sessionData = await validateRequest();
    if (!sessionData) return new Response("Unauthorized", { status: 401 });

    // 2. Limits Check
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 100000) {
        return NextResponse.json({ code: "TALOS_PAYLOAD_TOO_LARGE", message: "Request too large" }, { status: 413 });
    }

    try {
        const body = await req.json();

        // Validate Body
        if (!body.messages || !Array.isArray(body.messages)) {
            return NextResponse.json({ code: "TALOS_INVALID_REQUEST", message: "Invalid messages format" }, { status: 400 });
        }
        if (body.messages.length > 100) {
             return NextResponse.json({ code: "TALOS_TOO_MANY_MESSAGES", message: "Too many messages" }, { status: 413 });
        }
        
        // Model Validation (Mock Cached Check)
        // Model Validation (Mock Cached Check)
        // const validModels = ["llama3", "mistral"]; // In real impl, fetch from /v1/models with cache
        // if (!validModels.includes(body.model)) ... (Skipping strict check for demo stability, but noting implementation)

        // 3. Connect to Upstream
        const upstreamResponse = await fetch(`${AGENT_URL}/v1/chat/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Talos-Principal": sessionData.user.id,
                "X-Talos-Role": (sessionData.user as { role: string }).role || 'user'
            },
            body: JSON.stringify({
                message: body.messages[body.messages.length - 1].content,
                session_id: body.session_id || "demo-session-v1"
            }),
            signal: req.signal, 
        });

        if (!upstreamResponse.ok) {
             const err = await upstreamResponse.text();
             return NextResponse.json(
                { code: "TALOS_AGENT_ERROR", message: `Agent returned ${upstreamResponse.status}: ${err}` },
                { status: upstreamResponse.status }
             );
        }

        const data = await upstreamResponse.json();
        const responseText = data.response || "";

        // 4. Wrap JSON response into SSE for frontend compatibility
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Send meta event
                controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ secure: data.secure, message_id: data.message_id })}\n\n`));
                
                // Send content as token event
                controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ content: responseText })}\n\n`));
                
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        });

    } catch (error) {
        console.error("Agent proxy error", error);
        return NextResponse.json({ code: "TALOS_PROXY_ERROR", message: "Failed to connect to agent" }, { status: 502 });
    }
}
