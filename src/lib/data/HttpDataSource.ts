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
    // Base URL is irrelevant for proxy-based calls, but kept for legacy or weird paths
    private readonly baseUrl = "/api"; 


    protected events: AuditEvent[] = []; 

    constructor() {
        _integrityStatus = "OK";
        _backfillStatus = "IDLE";
        _backfillLoadedCount = 0;
        _backfillRetries = 0;
        _cursorGaps.length = 0;
    }

    async getGatewayStatus(): Promise<GatewayStatus> {
        const res = await fetch('/api/admin/v1/gateway/status');
        if (!res.ok) throw new Error('Failed to fetch status');
        return res.json();
    }

    async getMe(): Promise<UserProfile> {
        const res = await fetch("/api/admin/v1/me");
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
        const res = await fetch("/api/admin/v1/llm/chat/completions", {
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
        const res = await fetch("/api/admin/v1/secrets");
        if (!res.ok) throw new Error("Failed to list secrets");
        const data = await res.json();
        return data.secrets;
    }

    async createSecret(name: string, value: string): Promise<void> {
        const res = await fetch("/api/admin/v1/secrets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, value })
        });
        if (!res.ok) throw new Error("Failed to create secret");
    }

    async deleteSecret(name: string): Promise<void> {
        const res = await fetch(`/api/admin/v1/secrets?name=${encodeURIComponent(name)}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete secret");
    }

    async getStats(): Promise<DashboardStats> {
        // 1. Fetch real telemetry stats (usage/tokens)
        let usageStats: { 
            requests_total: number; 
            tokens_total: number; 
            cost_usd: number; 
            latency_avg_ms: number; 
        } | null = null;
        try {
            const res = await fetch(`${this.baseUrl}/admin/v1/telemetry/stats?window_hours=24`);
            if (res.ok) usageStats = await res.json();
        } catch (e) {
            console.error("Failed to fetch usage stats", e);
        }

        // 2. Fetch real audit stats (denials, volume series)
        let auditStats: DashboardStats | null = null;
        try {
            const res = await fetch(`${this.baseUrl}/admin/v1/audit/stats?window_hours=24`);
            if (res.ok) auditStats = await res.json();
        } catch (e) {
            console.error("Failed to fetch audit stats", e);
        }

        // Calculate real success rate from denial counts
        let successRate = 1.0;
        if (auditStats && auditStats.requests_24h > 0) {
            const totalDenials = Object.values(auditStats.denial_reason_counts || {}).reduce((a, b) => a + b, 0);
            successRate = (auditStats.requests_24h - totalDenials) / auditStats.requests_24h;
        }

        return {
            requests_24h: auditStats?.requests_24h ?? usageStats?.requests_total ?? 0,
            tokens_24h: usageStats?.tokens_total ?? 0,
            cost_24h: usageStats?.cost_usd ?? 0,
            latency_avg: usageStats?.latency_avg_ms ?? 0,
            auth_success_rate: successRate, 
            denial_reason_counts: auditStats?.denial_reason_counts ?? {},
            request_volume_series: auditStats?.request_volume_series ?? [],
            latency_percentiles: auditStats?.latency_percentiles ?? { p50: 10, p95: 20, p99: 50 },
        };
    }

    async listAuditEvents(params: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>> {
        // Call dashboard proxy, not direct service URL
        const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
        const url = new URL('/api/admin/v1/audit/events', origin);
        url.searchParams.set('limit', params.limit.toString());
        if (params.cursor) url.searchParams.set('before', params.cursor);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch events');

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
        let oldestCursor: string | undefined;
        let isClosed = false;

        const poll = async () => {
            if (isClosed) return;

            try {
                await this.pollStatus(cb);
                oldestCursor = await this.pollRecentEvents(cb, oldestCursor, filters);
                oldestCursor = await this.handleBackfill(cb, oldestCursor, filters);
            } catch (error) {
                console.error("[AuditStream] Poll failure", error);
            }
        };

        const interval = setInterval(() => {
            void poll();
        }, 2000);

        const EventSourceCtor = globalThis.EventSource;
        const es = EventSourceCtor ? new EventSourceCtor("/api/admin/v1/audit/stream") : null;

        if (es) {
            es.addEventListener("meta", (e: MessageEvent) => {
                console.log("[AuditStream] Connected", JSON.parse(e.data));
            });

            es.addEventListener("audit_event", (e: MessageEvent) => {
                try {
                    const event: AuditEvent = JSON.parse(e.data);
                    this.ingestEvent(event);

                    if (filters) {
                        if (filters.session_id && event.session_id !== filters.session_id) return;
                        if (filters.outcome && event.outcome !== filters.outcome) return;
                        if (filters.correlation_id && event.correlation_id !== filters.correlation_id) return;
                        if (filters.denial_reason && event.denial_reason !== filters.denial_reason) return;
                    }

                    cb({ type: "audit_event", event });
                } catch (error) {
                    console.error("[AuditStream] Parse error", error);
                }
            });

            es.addEventListener("heartbeat", () => {
                // Keep-alive received
            });

            es.addEventListener("error", (e: MessageEvent) => {
                try {
                    const err = JSON.parse(e.data);
                    console.error("[AuditStream] Server Error:", err);
                    es.close();
                } catch {
                    // If not JSON, it might be a generic error
                }
            });

            es.onerror = (_e) => {
                fetch("/api/auth/session")
                    .then(res => {
                        if (res.status === 401 || res.status === 403) {
                            console.error("[AuditStream] Session invalid, redirecting to login");
                            window.location.href = "/login";
                            es.close();
                        } else if (!res.ok) {
                            console.warn("[AuditStream] Connection issue, session check failed with status:", res.status);
                        } else {
                            console.log("[AuditStream] Connection lost, retrying...");
                        }
                    })
                    .catch(() => {
                        // Network error during session check, let SSE retry silently
                    });
            };
        }

        return () => {
            isClosed = true;
            clearInterval(interval);
            es?.close();
        };
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
