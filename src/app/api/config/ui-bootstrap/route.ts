import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { VERSION as CLIENT_CONTRACTS_VERSION } from "@talos-protocol/contracts";

const UPSTREAM = process.env.TALOS_CONFIGURATION_URL || "http://localhost:8000";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const principalId = (session as any).principalId || "unknown";

  try {
    // Parallel fetch for speed
    const [versionRes, healthRes, historyRes, schemaRes] = await Promise.all([
        fetch(`${UPSTREAM}/api/config/contracts-version`),
        fetch(`${UPSTREAM}/api/config/health`),
        fetch(`${UPSTREAM}/api/config/history?limit=1`, {
             headers: { "X-Talos-Principal-Id": principalId }
        }),
        fetch(`${UPSTREAM}/api/config/schema`)
    ]);

    if (!versionRes.ok) throw new Error("Backend unavailable (version check failed)");
    const { contracts_version: backendVersion } = await versionRes.json();

    // C3: Strict Version Gate
    if (backendVersion !== CLIENT_CONTRACTS_VERSION) {
        return NextResponse.json({
            error: "CONTRACTS_VERSION_MISMATCH",
            backend: backendVersion,
            frontend: CLIENT_CONTRACTS_VERSION,
            message: `Version mismatch: Backend ${backendVersion} vs Frontend ${CLIENT_CONTRACTS_VERSION}`
        }, { status: 409 });
    }

    const health = healthRes.ok ? await healthRes.json() : null;
    const history = historyRes.ok ? await historyRes.json() : { items: [] };
    const schema = schemaRes.ok ? await schemaRes.json() : null;

    // Get latest config digest and content
    let currentConfig = null;
    let configDigest = null;
    if (history.items && history.items.length > 0) {
        const latest = history.items[0];
        configDigest = latest.config_digest;
        try {
            currentConfig = JSON.parse(latest.config_json);
        } catch {}
    }

    return NextResponse.json({
        contracts_version: backendVersion,
        schema,
        config_digest: configDigest,
        current_config: currentConfig,
        health,
        // Feature flags could be added here
        feature_flags: {
            read_only: false // example
        }
    });

  } catch (e: any) {
    console.error("Bootstrap error:", e);
    return NextResponse.json({ error: "Backend Connection Failed", details: e.message }, { status: 502 });
  }
}
