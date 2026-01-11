import { AuditEvent, CursorPage, GatewayStatus } from "./schemas";
import { AuditFilters, DashboardStats, DataSource, StreamMessage, UserProfile, Upstream, ModelGroup, McpServer, McpPolicy, Secret } from "./DataSourceTypes";
import { checkCursorContinuity, type CursorGap } from "@talosprotocol/contracts";
import { validateCursor } from "../integrity/cursor";

// --- Integrity & Backfill State ---

export type IntegrityStatus = "OK" | "CURSOR_MISMATCH" | "INVALID_FRAME";
export type BackfillStatus = "IDLE" | "ACTIVE" | "COMPLETE" | "PARTIAL" | "FAILED";

// Private global state (since DataSource is singleton-ish)
let _integrityStatus: IntegrityStatus = "OK";
let _backfillStatus: BackfillStatus = "IDLE";
let _backfillLoadedCount = 0;
let _backfillRetries = 0;
const _cursorGaps: CursorGap[] = [];

export function getIntegrityStatus() { return _integrityStatus; }
export function getBackfillStatus() { return _backfillStatus; }
export function getCursorGaps() { return _cursorGaps; }
export function getBackfillRetryInfo() { return { retries: _backfillRetries, max: 3 }; }

export function retryBackfill() {
    if (_backfillRetries < 3) {
        _backfillStatus = "IDLE";
        _backfillRetries++;
    }
}

// --- HTTP Implementation ---

// Safety caps for backfill
const BACKFILL_MAX_EVENTS = 1000;
const BACKFILL_PAGE_SIZE = 100;

export class HttpDataSource implements DataSource {
    private readonly baseUrl = "http://localhost:8000";

    protected events: AuditEvent[] = []; 

    // Constructor removed (useless)

    async getGatewayStatus(): Promise<GatewayStatus> {
        const res = await fetch(`${this.baseUrl}/api/gateway/status`);
        if (!res.ok) throw new Error("Failed to fetch status");
        return res.json();
    }

    async getMe(): Promise<UserProfile> {
        const res = await fetch(`${this.baseUrl}/admin/v1/me`);
        if (!res.ok) throw new Error("Failed to fetch user profile");
        return res.json();
    }

    // LLM Management
    async listUpstreams(): Promise<Upstream[]> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/upstreams`);
        if (!res.ok) throw new Error("Failed to list upstreams");
        const data = await res.json();
        return data.upstreams;
    }

    async createUpstream(data: Partial<Upstream>): Promise<Upstream> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/upstreams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to create upstream");
        return res.json();
    }

    async updateUpstream(id: string, data: Partial<Upstream>, expectedVersion: number): Promise<Upstream> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/upstreams/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, expected_version: expectedVersion })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail?.error?.message || "Failed to update upstream");
        }
        return res.json();
    }

    async deleteUpstream(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/upstreams/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete upstream");
    }

    async listModelGroups(): Promise<ModelGroup[]> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/model-groups`); // Adjusted to match common plural
        if (!res.ok) {
            // Fallback for singular if plural fails
            const res2 = await fetch(`${this.baseUrl}/admin/v1/llm/model_groups`);
            if (!res2.ok) throw new Error("Failed to list model groups");
            const data = await res2.json();
            return data.model_groups;
        }
        const data = await res.json();
        return data.model_groups;
    }

    async createModelGroup(data: Partial<ModelGroup>): Promise<ModelGroup> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/model-groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to create model group");
        return res.json();
    }

    async updateModelGroup(id: string, data: Partial<ModelGroup>, expectedVersion: number): Promise<ModelGroup> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/model-groups/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, expected_version: expectedVersion })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail?.error?.message || "Failed to update model group");
        }
        return res.json();
    }

    async deleteModelGroup(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/v1/llm/model-groups/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete model group");
    }

    // MCP Management
    async listMcpServers(): Promise<McpServer[]> {
        const res = await fetch(`${this.baseUrl}/admin/v1/mcp/servers`);
        if (!res.ok) throw new Error("Failed to list MCP servers");
        const data = await res.json();
        return data.servers;
    }

    async createMcpServer(data: Partial<McpServer>): Promise<McpServer> {
        const res = await fetch(`${this.baseUrl}/admin/v1/mcp/servers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to create MCP server");
        return res.json();
    }

    async updateMcpServer(id: string, data: Partial<McpServer>, expectedVersion: number): Promise<McpServer> {
        const res = await fetch(`${this.baseUrl}/admin/v1/mcp/servers/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, expected_version: expectedVersion })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail?.error?.message || "Failed to update MCP server");
        }
        return res.json();
    }

    async deleteMcpServer(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/v1/mcp/servers/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete MCP server");
    }

    async listMcpPolicies(teamId?: string): Promise<McpPolicy[]> {
        const url = new URL(`${this.baseUrl}/admin/v1/mcp/policies`);
        if (teamId) url.searchParams.set("team_id", teamId);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to list MCP policies");
        const data = await res.json();
        return data.policies;
    }

    async upsertMcpPolicy(data: Partial<McpPolicy>): Promise<McpPolicy> {
        const res = await fetch(`${this.baseUrl}/admin/v1/mcp/policies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to upsert MCP policy");
        return res.json();
    }

    async deleteMcpPolicy(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/v1/mcp/policies/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete MCP policy");
    }

    async chatCompletion(apiKey: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Chat failed: ${res.status}`);
        }
        return res.json() as Promise<Record<string, unknown>>;
    }

    // Secrets Management
    async listSecrets(): Promise<Secret[]> {
        const res = await fetch(`${this.baseUrl}/admin/v1/secrets`);
        if (!res.ok) throw new Error("Failed to list secrets");
        const data = await res.json();
        return data.secrets;
    }

    async createSecret(name: string, value: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/v1/secrets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, value })
        });
        if (!res.ok) throw new Error("Failed to create secret");
    }

    async deleteSecret(name: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/v1/secrets/${name}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete secret");
    }

    async getStats(): Promise<DashboardStats> {
        // 1. Fetch real telemetry stats from backend
        // Note: Admin principal required, should be handled by session/cookie
        let realStats: { 
            requests_total: number; 
            tokens_total: number; 
            cost_usd: number; 
            latency_avg_ms: number; 
        } | null = null;
        try {
            const res = await fetch(`${this.baseUrl}/admin/v1/telemetry/stats?window_hours=24`);
            if (res.ok) {
                realStats = await res.json();
            }
        } catch (e) {
            console.error("Failed to fetch real telemetry stats", e);
        }

        // 2. Fallback/Complementary enrichment from audit events (for charts)
        const res = await this.listAuditEvents({ limit: 500 });
        const events = res.items;

        const total = events.length;
        const ok = events.filter(e => e.outcome === "OK").length;

        const denial_counts: Record<string, number> = {};
        events.filter(e => e.outcome === "DENY").forEach(e => {
            const reason = e.denial_reason || "UNKNOWN";
            denial_counts[reason] = (denial_counts[reason] || 0) + 1;
        });

        const seriesMap = new Map<number, { ok: number; deny: number; error: number }>();
        events.forEach(e => {
            const bucket = Math.floor(e.timestamp / 3600) * 3600;
            if (!seriesMap.has(bucket)) seriesMap.set(bucket, { ok: 0, deny: 0, error: 0 });
            const entry = seriesMap.get(bucket)!;
            if (e.outcome === "OK") entry.ok++;
            else if (e.outcome === "DENY") entry.deny++;
            else entry.error++;
        });

        return {
            requests_24h: realStats?.requests_total ?? total,
            tokens_24h: realStats?.tokens_total,
            cost_24h: realStats?.cost_usd,
            latency_avg: realStats?.latency_avg_ms,
            auth_success_rate: total > 0 ? ok / total : 1,
            denial_reason_counts: denial_counts,
            request_volume_series: Array.from(seriesMap.entries())
                .map(([time, data]) => ({ time, ...data }))
                .sort((a, b) => a.time - b.time),
            latency_percentiles: { p50: 10, p95: 20, p99: 50 },
        };
    }

    async listAuditEvents(params: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>> {
        const url = new URL(`${this.baseUrl}/api/events`);
        url.searchParams.set("limit", params.limit.toString());
        if (params.cursor) url.searchParams.set("before", params.cursor);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch events");

        const data: CursorPage<AuditEvent> = await res.json();

        // --- ENFORCEMENT: Validate Cursors on Ingress ---
        data.items.forEach(event => this.ingestEvent(event));

        return data;
    }

    protected ingestEvent(event: AuditEvent) {
        const validation = validateCursor(event);
        if (!validation.ok) {
            console.error("Integrity Failure:", {
                eventId: event.event_id,
                received: event.cursor,
                derived: validation.derived,
                reason: validation.reason
            });

            if (validation.reason) {
                _integrityStatus = validation.reason;
            }

            if (!event.integrity) {
                event.integrity = {
                    proof_state: "FAILED",
                    signature_state: "INVALID",
                    anchor_state: "NOT_ENABLED",
                    verifier_version: "3.2"
                };
            }
            if (validation.reason === "CURSOR_MISMATCH") {
                event.integrity.failure_reason = "CURSOR_MISMATCH";
            }
        }
    }

    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void {
        const state = {
            oldestLoadedCursor: undefined as string | undefined
        };

        const interval = setInterval(async () => {
            try {
                await this.pollStatus(cb);
                state.oldestLoadedCursor = await this.pollRecentEvents(cb, state.oldestLoadedCursor, filters);
                state.oldestLoadedCursor = await this.handleBackfill(cb, state.oldestLoadedCursor, filters);
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }

    private async pollStatus(cb: (msg: StreamMessage) => void) {
        const status = await this.getGatewayStatus();
        cb({ type: "gateway_status", status });
    }

    private async pollRecentEvents(cb: (msg: StreamMessage) => void, oldest: string | undefined, filters?: AuditFilters): Promise<string | undefined> {
        const recent = await this.listAuditEvents({ limit: 10, filters });
        if (recent.items.length === 0) return oldest;

        recent.items.forEach(e => cb({ type: "audit_event", event: e }));
        return oldest || recent.items.at(-1)?.cursor;
    }

    private async handleBackfill(cb: (msg: StreamMessage) => void, oldest: string | undefined, filters?: AuditFilters): Promise<string | undefined> {
        if (_backfillStatus !== "IDLE" || !oldest || _backfillLoadedCount >= BACKFILL_MAX_EVENTS) {
            return oldest;
        }

        _backfillStatus = "ACTIVE";
        console.log(`Backfilling from cursor: ${oldest}`);

        const page = await this.listAuditEvents({
            limit: BACKFILL_PAGE_SIZE,
            cursor: oldest,
            filters
        });

        if (page.items.length === 0) {
            _backfillStatus = "COMPLETE";
            return oldest;
        }

        this.processBackfillPage(cb, page.items);
        _backfillLoadedCount += page.items.length;

        const newOldest = page.items.at(-1)?.cursor;
        if (newOldest === oldest || !page.next_cursor) {
            const hasNext = !!page.next_cursor;
            if (hasNext) {
                _backfillStatus = "FAILED";
                console.warn("Backfill stuck: cursor did not verify progress.");
            } else {
                _backfillStatus = "COMPLETE";
            }
        } else {
            _backfillStatus = _backfillLoadedCount >= BACKFILL_MAX_EVENTS ? "PARTIAL" : "IDLE";
        }

        return newOldest || oldest;
    }

    private processBackfillPage(cb: (msg: StreamMessage) => void, items: AuditEvent[]) {
        const continuity = checkCursorContinuity(items);
        if (continuity.status === "GAP_DETECTED") {
            console.warn("Gap detected in backfill", continuity.gaps);
            _cursorGaps.push(...continuity.gaps);
            continuity.gaps.forEach(g => {
                cb({ type: "cursor_gap", from: g.from_cursor, to: g.to_cursor });
            });
        }
        items.forEach(e => cb({ type: "audit_event", event: e }));
    }
}
