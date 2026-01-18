import { NextResponse } from 'next/server';

// CRITICAL: Must be /runtime-config, NOT /api/runtime-config
// because /api/* routes to gateway via Ingress
export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    auditUrl: process.env.NEXT_PUBLIC_AUDIT_URL || '/audit',
    mcpUrl: process.env.NEXT_PUBLIC_MCP_URL || '/mcp',
    devMode: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
    version: process.env.VERSION || 'unknown',
    gitSha: process.env.GIT_SHA || 'unknown'
  });
}
