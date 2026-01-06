import { createEvidenceBundle, RedactionLevel, AuditEvent, GatewayStatus } from "@talosprotocol/contracts";
import { AuditFilters } from "@/lib/data/DataSource";

export interface ExportOptions {
    events: AuditEvent[];
    redactionLevel?: RedactionLevel;
    gatewaySnapshot?: GatewayStatus;
    filters?: AuditFilters;
    cursorRange?: { start?: string; end?: string };
    dashboardVersion: string;
    onProgress?: (stage: "preparing" | "validating" | "downloading", progress: number) => void;
}

export class ExportLimitExceededError extends Error {
    constructor(public count: number, public limit: number) {
        super(`Export limit exceeded: ${count} events (max ${limit})`);
        this.name = "ExportLimitExceededError";
    }
}

export async function downloadBulkEvidenceBundle(params: ExportOptions): Promise<void> {
    const MAX_EVENTS = 10_000;

    if (params.events.length > MAX_EVENTS) {
        throw new ExportLimitExceededError(params.events.length, MAX_EVENTS);
    }

    params.onProgress?.("preparing", 10);

    // Yield to event loop to avoid freezing UI
    await new Promise(resolve => setTimeout(resolve, 0));

    params.onProgress?.("validating", 30);

    const bundle = createEvidenceBundle({
        events: params.events,
        redactionLevel: params.redactionLevel ?? "safe_default",
        gatewaySnapshot: params.gatewaySnapshot,
        filters: params.filters as any,
        cursorRange: params.cursorRange,
        dashboardVersion: params.dashboardVersion
    });

    params.onProgress?.("downloading", 80);

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence_bundle_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        params.onProgress?.("downloading", 100);
    }, 100);
}
