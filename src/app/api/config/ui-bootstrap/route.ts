import { validateRequest } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import { VERSION as CLIENT_CONTRACTS_VERSION } from "@talos-protocol/contracts";
import { DATA_SOURCE_MODE } from "@/lib/config";

const UPSTREAM = process.env.TALOS_CONFIGURATION_URL || "http://localhost:8000";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Mock Mode Support
  if (DATA_SOURCE_MODE === 'MOCK') {
      return NextResponse.json({
          contracts_version: CLIENT_CONTRACTS_VERSION,
          config_version_supported: CLIENT_CONTRACTS_VERSION,
          schema: {}, 
          config_digest: "mock-digest",
          active_config_id: "mock-config-1",
          current_config: {},
          health: { status: "ok" },
          feature_flags: { read_only: false }
      });
  }

  const sessionData = await validateRequest();
  if (!sessionData) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // C2: Strict Principal Identity
  const principalId = sessionData.user?.id || (sessionData.user as any)?.email || "dev";

  try {
    // Parallel fetch for speed
    const [versionRes, healthRes, historyRes, schemaRes] = await Promise.all([
        fetch(`${UPSTREAM}/api/config/contracts-version`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${UPSTREAM}/api/config/health`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${UPSTREAM}/api/config/history?limit=1`, {
             headers: { "X-Talos-Principal-Id": principalId },
             signal: AbortSignal.timeout(5000)
        }),
        fetch(`${UPSTREAM}/api/config/schema`, { signal: AbortSignal.timeout(5000) })
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

    // Get latest config metadata
    let currentConfig = null;
    let configDigest = null;
    let activeConfigId = null;
    
    if (history.items && history.items.length > 0) {
        const latest = history.items[0];
        configDigest = latest.config_digest;
        activeConfigId = latest.id;
        try {
            currentConfig = JSON.parse(latest.config_json);
        } catch {}
    }

    return NextResponse.json({
        contracts_version: backendVersion,
        config_version_supported: CLIENT_CONTRACTS_VERSION, // UI-supported version
        schema,
        config_digest: configDigest,
        active_config_id: activeConfigId,
        current_config: currentConfig,
        health,
        feature_flags: {
            read_only: false // example
        }
    });

  } catch (e: any) {
    console.error("Bootstrap error:", e);
    return NextResponse.json({ error: "Backend Connection Failed", details: e.message }, { status: 502 });
  }
}
