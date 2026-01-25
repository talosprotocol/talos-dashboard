import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge'; // Use Edge for proxying if possible, or nodejs

const UPSTREAM = process.env.TALOS_CONFIGURATION_URL || "http://localhost:8000";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Next.js 16: params is a promise
  const { path } = await params;
  const pathStr = path.join("/");

  // C2: Strict Allowlist (Exact paths only, no wildcards beyond specific endpoints if needed)
  if (!isValidConfigPath(pathStr, req.method)) {
      return new NextResponse("Forbidden Path or Method", { status: 403 });
  }

  // C2: Strict Principal Identity - Source ONLY from session
  // Ignore any incoming X-Talos-Principal-Id from client
  const principalId = (session as any).principalId;
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!principalId) {
      if (isDev) {
          // Dev fallback
          headers.set("X-Talos-Principal-Id", "dev");
      } else {
          // Prod Fail Closed
          console.error("Security: Missing Principal ID in session");
          return new NextResponse("Unauthorized: Missing Identity", { status: 401 });
      }
  } else {
       headers.set("X-Talos-Principal-Id", principalId);
  }

  // C4: Body Size Limit check (approximate via Content-Length)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 256 * 1024) {
      return new NextResponse("Payload too large (max 256KB)", { status: 413 });
  }

  const upstreamUrl = `${UPSTREAM}/api/config/${pathStr}${req.nextUrl.search}`;

  try {
    // Clean headers - remove host/connection and any user-supplied principal
    headers.delete("host");
    headers.delete("connection");
    // Ensure we don't forward any client-side principal header if logic above somehow missed it (defense in depth)
    // The set() above overwrites, but explicitly deleting first is safer logic mentally
    headers.delete("X-Talos-Principal-Id");
    if (principalId) headers.set("X-Talos-Principal-Id", principalId);
    else if (isDev) headers.set("X-Talos-Principal-Id", "dev");

    const res = await fetch(upstreamUrl, {
      method: req.method,
      headers: headers,
      body: req.body, // Stream the body
      signal: req.signal,
    });

    return new NextResponse(res.body, {
      status: res.status,
      headers: res.headers,
    });

  } catch (e: any) {
    console.error("Proxy error:", e);
    return new NextResponse("Bad Gateway", { status: 502 });
  }
}

// Allowlist Helper
function isValidConfigPath(path: string, method: string): boolean {
    const validGet = new Set(['health', 'contracts-version', 'schema', 'history', 'export']);
    const validPost = new Set(['validate', 'normalize', 'drafts', 'publish', 'export']); // Export can be POST if filters added
    
    // Normalize path just in case of trailing slashes or sub-paths if necessary
    // Our paths seem to be single segment mostly, except maybe history/drafts?
    // User asked for exact paths.
    if (method === 'GET' && validGet.has(path)) return true;
    if (method === 'POST' && validPost.has(path)) return true;
    
    return false;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
