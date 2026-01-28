import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = 'http://127.0.0.1:11434/v1/chat/completions';

export async function POST(req: NextRequest) {
    // 1. Feature Gate
    if (process.env.ENABLE_LOCAL_OLLAMA_PROXY !== 'true') {
        return new NextResponse("Not Found: Agent Proxy Disabled", { status: 404 });
    }

    try {
        const body = await req.json();

        // 2. Strict Input Validation
        // Only allow specific parameters to prevent upstream pollution
        const cleanBody = {
            model: body.model || 'llama3', // Default or user provided
            messages: body.messages, // Pass through messages
            stream: true, // Force streaming
            temperature: 0.7,
            max_tokens: 2000
        };

        // 3. Proxy to Ollama
        const upstream = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cleanBody)
        });

        if (!upstream.ok) {
            return new NextResponse(`Upstream Error: ${upstream.statusText}`, { status: upstream.status });
        }

        // 4. Pass through stream
        return new NextResponse(upstream.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (e) {
        console.error("Agent Proxy Error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
