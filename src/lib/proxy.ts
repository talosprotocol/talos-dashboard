import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "./auth/session";

// STOP-SHIP: Strict Allowlist (Exact Paths)
// STOP-SHIP: Strict Allowlist (Exact Paths)
// Method -> Set of allowed normalized paths (must start with /)
const ALLOWED_ROUTES: Record<string, Set<string>> = {
  'GET': new Set([
     '/health', 
     '/contracts-version', 
     '/schema', 
     '/history', 
     '/ui-bootstrap'
  ]),
  'POST': new Set([
     '/drafts', 
     '/validate', 
     '/normalize', 
     '/publish', 
     '/export'
  ])
};

export interface ProxyOptions {
    upstreamUrl: string;
    serviceToken?: string;
    upstreamPrefix?: string; // e.g. '/v1'
}

/**
 * Normalizes and validates a path to prevent traversal.
 * Returns the normalized path (e.g. "/active") or null if invalid.
 */
export function normalizeAndValidatePath(pathSegments: string[]): string | null {
    if (!pathSegments || pathSegments.length === 0) return null;

    // 1. Raw Logic Check (Implicit in Next.js params, but good to double check segments)
    // We expect segments to NOT contain separators if they were split correctly,
    // but we must reject specific patterns.
    for (const seg of pathSegments) {
        // Reject empty, dot, double dot immediately
        if (!seg || seg === '.' || seg === '..') return null;
        
        // Reject separators in segments (shouldn't happen if split correctly but safe to check)
        if (seg.includes('/') || seg.includes('\\')) return null;
        
        // 2. Decode & Validate
        try {
            const decoded = decodeURIComponent(seg);
            // Reject traversal tokens in decoded content
            if (decoded.includes('/') || decoded.includes('\\') || decoded === '..' || decoded === '.') {
                 return null;
            }
            // Reject raw encoded traversal patterns (case-insensitive) just in case
            // %2e = ., %2f = /, %5c = \
            const lower = seg.toLowerCase();
            if (lower.includes('%2e') || lower.includes('%2f') || lower.includes('%5c')) {
                return null;
            }
        } catch (e) {
            return null; // Malformed URI component
        }
    }
    
    // 3. Canonicalize: Join with / and prepend /
    return '/' + pathSegments.join('/');
}

/**
 * Checks if the route exists in ANY method allowed (for 405 checks).
 */
function routeExists(normalizedPath: string): boolean {
    return Object.values(ALLOWED_ROUTES).some(s => s.has(normalizedPath));
}

/**
 * Enforces strict proxy security policies.
 */
export async function createRecastRequest(
    req: NextRequest, 
    pathSegments: string[], 
    options: ProxyOptions
): Promise<{ url: URL, headers: Headers } | NextResponse> {
    
    // 1. Path Normalization & Validation (400)
    const normalizedPath = normalizeAndValidatePath(pathSegments);
    if (!normalizedPath) {
        return new NextResponse("Bad Request: Invalid Path", { status: 400 });
    }

    // 2. Allowlist Check (404 and 405)
    // First, check if the path exists at all in the strict allowlist
    const exists = routeExists(normalizedPath);
    if (!exists) {
        // If strict, we consider anything not explicitly in the list as 404
        return new NextResponse("Not Found: Route Not Allowed", { status: 404 });
    }

    // Path exists, check Method
    const allowedForMethod = ALLOWED_ROUTES[req.method.toUpperCase()];
    if (!allowedForMethod || !allowedForMethod.has(normalizedPath)) {
        return new NextResponse("Method Not Allowed", { status: 405 });
    }
    
    // 3. Session & Principal Validation (401)
    const session = await validateRequest();
    if (!session || !session.user) {
        return new NextResponse("Unauthorized: Session Required", { status: 401 });
    }
    
    // Valid session -> Extract Principal
    let principalId = session.user.id;
    if (!principalId && (session.user as any).email) {
        principalId = (session.user as any).email;
    }
    if (!principalId) {
         // Fallback for dev only if needed, but PR-1 says Strict.
         if (process.env.NODE_ENV === 'development') principalId = 'dev-user';
         else return new NextResponse("Forbidden: No Identity", { status: 403 });
    }

    // 4. Upstream URL Construction
    try {
        const baseUrl = options.upstreamUrl.replace(/\/$/, ''); // strip trailing slash
        const prefix = (options.upstreamPrefix || '').replace(/\/$/, '');
        
        // Construct upstream URL safely
        const upstream = new URL(baseUrl + prefix + normalizedPath);
        
        // Preserve Query Params
        req.nextUrl.searchParams.forEach((value, key) => {
            upstream.searchParams.append(key, value);
        });

        // 5. Secure Headers
        const headers = new Headers();
        
        // Allowed Forwarded Headers
        const allowedHeaders = ['content-type', 'accept', 'if-match', 'if-none-match'];
        allowedHeaders.forEach(h => {
             const val = req.headers.get(h);
             if (val) headers.set(h, val);
        });

        // Idempotency-Key
        // Forward ONLY for mutation methods
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
        const idemKey = req.headers.get('idempotency-key');
        
        if (idemKey && isMutation) {
            // Validate length/charset
            if (idemKey.length > 128 || !/^[A-Za-z0-9_\-]+$/.test(idemKey)) {
                 return new NextResponse("Bad Request: Invalid Idempotency-Key", { status: 400 });
            }
            headers.set('Idempotency-Key', idemKey);
        }
        // If GET/HEAD, we simply ignore/drop the header as per spec

        // Inject Security Headers
        headers.set('X-Talos-Principal-Id', principalId);
        // Inject X-Request-Id (Reuse incoming or generate? Spec says "stable". Typically forward existing or new)
        const reqId = req.headers.get('x-request-id') || crypto.randomUUID();
        headers.set('X-Request-Id', reqId);
        
        if (options.serviceToken) {
            headers.set('Authorization', `Bearer ${options.serviceToken}`);
        }

        return { url: upstream, headers };

    } catch (e) {
        console.error("Proxy Construction Error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
