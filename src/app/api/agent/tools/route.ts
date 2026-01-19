import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.TALOS_CHAT_URL || "http://talos-chat-agent:8090";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/v1/tools`);
    
    if (!res.ok) {
        return NextResponse.json({ tools: [] }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch tools", error);
    return NextResponse.json({ tools: [] }, { status: 502 });
  }
}
