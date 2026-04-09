import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.TALOS_CHAT_URL || "http://talos-chat-agent:8090";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/v1/chat/summary`);
    
    if (!res.ok) {
        return NextResponse.json({ tools: [] }, { status: res.status });
    }
    
    const data = await res.json();
    
    // If the service is active, we return the standard secure agent tools
    // The main.py does not expose /v1/tools yet, so we return a baseline to align with visibility
    const tools = [
        {
            name: "read_file",
            description: "Read authorized local files for auditing purposes",
            parameters: { type: "object", properties: { path: { type: "string" } } }
        },
        {
            name: "crypto_verify",
            description: "Verify cryptographic signatures of incoming data",
            parameters: { type: "object", properties: { data: { type: "string" }, signature: { type: "string" } } }
        }
    ];

    return NextResponse.json({ tools });
  } catch (error) {
    console.error("Failed to fetch tools", error);
    return NextResponse.json({ tools: [] }, { status: 502 });
  }
}
