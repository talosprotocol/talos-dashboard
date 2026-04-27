import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.TALOS_CHAT_URL || "http://talos-chat-agent:8100";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/v1/chat/summary`);
    
    if (!res.ok) {
        return NextResponse.json({ models: [] }, { status: res.status });
    }
    
    // The main.py does not define /v1/models, but uses AI_MODEL env var
    // We return a list showing the tinyllama default and local options
    return NextResponse.json({ 
        models: [
            { id: "tinyllama:latest", name: "TinyLlama (Fast/Secure)", group: "Security Focused" },
            { id: "llama3", name: "Llama 3 (Enhanced)", group: "General Intelligence" }
        ] 
    });
  } catch (error) {
    console.error("Failed to fetch models", error);
    return NextResponse.json({ models: [] }, { status: 502 });
  }
}
