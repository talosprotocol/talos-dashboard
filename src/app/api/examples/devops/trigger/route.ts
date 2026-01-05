import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 30000;
const AIOPS_URL = process.env.TALOS_AIOPS_URL ?? "http://localhost:8200";

// --- Schema Validation ---

const TriggerRequestSchema = z.object({
  action: z.enum(["plan_deploy_verify", "deny_demo", "status_only"]),
});

const TriggerResponseSchema = z.object({
  job_id: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "denied"]),
  message: z.string().optional(),
});

/**
 * POST /api/examples/devops/trigger
 * Proxy to {AIOPS_URL}/v1/trigger
 */
export async function POST(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 1. Content-Type Check
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().startsWith("application/json")) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_INPUT",
          details: { reason: "invalid_content_type" },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2. Request Schema Validation
    let bodyJson;
    try {
      const bodyText = await req.text();
      bodyJson = JSON.parse(bodyText);
      TriggerRequestSchema.parse(bodyJson);
    } catch (e) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_INPUT",
          details: { reason: "schema_validation_failed", error: e },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 3. Upstream Request
    const res = await fetch(`${AIOPS_URL}/v1/trigger`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyJson),
      cache: "no-store",
    });

    // 4. Upstream Validation
    const data = await res.json();

    try {
      if (res.ok) {
        TriggerResponseSchema.parse(data);
      }
    } catch (e) {
      return NextResponse.json(
        {
          code: "TALOS_INVALID_UPSTREAM_RESPONSE",
          details: { reason: "schema_mismatch" },
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { code: "TALOS_TIMEOUT", details: { timeout_ms: TIMEOUT_MS } },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { code: "TALOS_UNAVAILABLE", details: { reason: "backend_unreachable" } },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
