import { NextRequest, NextResponse } from "next/server";
import { createRecastRequest } from "@/lib/proxy";

export const runtime = 'nodejs';

// Configuration
const UPSTREAM = process.env.TALOS_CONFIGURATION_URL || "http://localhost:8003";
const SERVICE_TOKEN = process.env.TALOS_SERVICE_TOKEN; 
// const UPSTREAM_PREFIX = '/v1'; // Uncommon if base is localhost:8000/api/config? 
// Current routes.py seems to listen on /api/config.
// However, the proxy logic constructs URL as baseUrl + prefix + normalizedPath.
// If valid path is '/active', and app/api/config/[...path] maps to it...
// Request: /api/config/active -> path=['active'] -> normalized='/active'
// Upstream: localhost:8000/api/config/active
// So UPSTREAM should be generic base, or we append /api/config?
// Looking at routes.py: `app.include_router(router, prefix="/api/config")`
// So yes, upstream needs /api/config path.

const UPSTREAM_API_ROOT = `${UPSTREAM}/api/config`;

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  
  try {
      const result = await createRecastRequest(req, path, {
          upstreamUrl: UPSTREAM_API_ROOT,
          serviceToken: SERVICE_TOKEN
      });

      // Handle immediate validation returns (401, 403, 404, 400)
      if (result instanceof NextResponse) {
          return result;
      }

      const { url, headers } = result;

      // 10s Timeout default, 30s for export
      const isExport = path.includes('export');
      const timeout = isExport ? 30000 : 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
          method: req.method,
          headers: headers,
          body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : req.body,
          signal: controller.signal,
          // duplex: 'half' is required for streaming bodies in some fetch implementations
          // @ts-expect-error - duplex option is valid in node-fetch but not typed in built-in fetch
          duplex: 'half' 
      });

      clearTimeout(timeoutId);

      return new NextResponse(res.body, {
          status: res.status,
          headers: res.headers
      });

  } catch (e: unknown) {
      const err = e as Error;
      // Deterministic Error Mapping
      if (err.name === 'AbortError') {
          return new NextResponse("Gateway Timeout", { status: 504 });
      }
      if (err.message === "Invalid Idempotency-Key format") {
           return new NextResponse("Bad Request: Invalid Idempotency-Key", { status: 400 });
      }
      console.error("Proxy Upstream Error:", err);
      return new NextResponse("Bad Gateway", { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
