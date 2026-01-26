import { validateRequest } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import { DATA_SOURCE_MODE } from "@/lib/config";

export const runtime = 'nodejs'; 

const UPSTREAM = process.env.TALOS_CONFIGURATION_URL || "http://localhost:8000";

// Simple in-memory rate limiter for Edge/Node
// In a real production multi-instance setup, this would use Redis
const rateLimits = new Map<string, { count: number, reset: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const state = rateLimits.get(ip) || { count: 0, reset: now + windowMs };
    
    if (now > state.reset) {
        state.count = 1;
        state.reset = now + windowMs;
    } else {
        state.count++;
    }
    
    rateLimits.set(ip, state);
    return state.count <= limit;
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Mock Mode Support
  if (DATA_SOURCE_MODE === 'MOCK') {
      const { path } = await params;
      const pathStr = path.join("/");
      
      if (pathStr === 'drafts' && req.method === 'POST') {
          return NextResponse.json({ 
            id: "mock-draft-1", 
            draft_id: "mock-draft-1", // ensure draft_id is also present if needed
            status: "DRAFT", 
            created_at: new Date().toISOString(),
            config_digest: "mock-digest-hash-value-123456" 
          });
      }
      if (pathStr === 'history') {
          return NextResponse.json({ items: [] });
      }
      return NextResponse.json({ error: "Mock endpoint not implemented" }, { status: 404 });
  }

  const sessionData = await validateRequest();
  if (!sessionData) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path } = await params;
  const pathStr = path.join("/");

  // C2: Strict Allowlist
  if (!isValidConfigPath(pathStr, req.method)) {
      return new NextResponse("Forbidden Path or Method", { status: 403 });
  }

  // C4: Rate Limiting for /validate
  if (pathStr === "validate") {
      const ip = req.headers.get("x-forwarded-for") || "local";
      if (!checkRateLimit(ip, 10, 60000)) { // 10 per minute
          return new NextResponse("Rate limit exceeded for validation", { status: 429 });
      }
  }

  // C4: Body Size Limit check (256KB)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 256 * 1024) {
      return new NextResponse("Payload too large (max 256KB)", { status: 413 });
  }

  // C4: Parameter Validation & Clamping for /history
  const nextUrl = req.nextUrl.clone();
  if (pathStr === "history") {
      const limitStr = nextUrl.searchParams.get("limit");
      if (limitStr) {
          let limit = parseInt(limitStr, 10);
          if (isNaN(limit) || limit < 1) limit = 1;
          if (limit > 200) limit = 200; // C4: Clamp limit
          nextUrl.searchParams.set("limit", limit.toString());
      }
      
      const cursor = nextUrl.searchParams.get("cursor");
      if (cursor && !/^[a-zA-Z0-9_-]+$/.test(cursor)) {
          return new NextResponse("Invalid cursor format", { status: 400 });
      }
  }

  // C2: Strict Principal Identity - Source ONLY from session
  // Proxy ignores any client-supplied X-Talos-Principal-Id to prevent spoofing
  // C2: Strict Principal Identity - Source ONLY from session
  // Proxy ignores any client-supplied X-Talos-Principal-Id to prevent spoofing
  const principalId = sessionData.user?.id || (sessionData.user as any)?.email || "dev";
  const isDev = process.env.NODE_ENV === 'development';

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("X-Talos-Principal-Id"); // Defense in depth: remove if exists
  
  if (!principalId && !isDev) {
      console.error("Security: Missing Principal ID in session");
      return new NextResponse("Unauthorized: Missing Identity", { status: 401 });
  }
  
  headers.set("X-Talos-Principal-Id", principalId || "dev");

  const upstreamUrl = `${UPSTREAM}/api/config/${pathStr}${nextUrl.search}`;
  
  console.log(`[Proxy] ${req.method} ${upstreamUrl}`);
  console.log(`[Proxy] Headers:`, Object.fromEntries(headers.entries()));

  try {
    // C4: Timeouts
    const controller = new AbortController();
    const timeout = pathStr === 'export' ? 30000 : 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(upstreamUrl, {
      method: req.method,
      headers: headers,
      body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
      signal: controller.signal,
      duplex: 'half', 
    } as any);

    clearTimeout(timeoutId);

    return new NextResponse(res.body, {
      status: res.status,
      headers: res.headers,
    });

  } catch (e: any) {
    if (e.name === 'AbortError') {
        return new NextResponse("Upstream Timeout", { status: 504 });
    }
    console.error("Proxy error:", e);
    return new NextResponse("Bad Gateway", { status: 502 });
  }
}

function isValidConfigPath(path: string, method: string): boolean {
    const validGet = new Set(['health', 'contracts-version', 'schema', 'history', 'export']);
    const validPost = new Set(['validate', 'normalize', 'drafts', 'publish', 'export']);
    
    if (method === 'GET' && validGet.has(path)) return true;
    if (method === 'POST' && validPost.has(path)) return true;
    
    return false;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
