import {
    AuditEvent,
    GatewayStatus,
    CursorPage
} from "./schemas";
import { MOCK_EVENTS } from "./mock/events";
import { MOCK_GATEWAY_STATUS } from "./mock/status";

// Import Refactored Types & Base Class
import { 
    DataSource, 
    DataMode, 
    DashboardStats, 
    AuditFilters, 
    StreamMessage,
    UserProfile,
    Upstream,
    ModelGroup,
    McpServer,
    McpPolicy,
    Secret,
    KekStatus,
    RotationOperation,
    ConfigExport,
    RbacRole,
    RbacBinding
} from "./DataSourceTypes";
import { HttpDataSource } from "./HttpDataSource";
import { deriveCursor, decodeCursor } from "../integrity/cursor";

// Re-export for compatibility
export * from "./DataSourceTypes";
export * from "./HttpDataSource";

// --- Helpers ---

// Wrapper for backwards compatibility with old API shape
function decodeCursorCompat(cursor: string): { timestamp: number; eventId: string } | null {
    try {
        const result = decodeCursor(cursor);
        return { timestamp: result.timestamp, eventId: result.event_id };
    } catch {
        return null;
    }
}

// --- v3.2 Cursor Comparators (Frozen) ---

type CursorKey = { timestamp: number; eventId: string };

/**
 * Extract cursor key from an event.
 * Per v3.2: cursor_key(event) = (event.timestamp, event.event_id)
 */
export function cursorKey(event: { timestamp: number; event_id: string }): CursorKey {
    return { timestamp: event.timestamp, eventId: event.event_id };
}

/**
 * Compare cursor keys for ordering.
 * Per v3.2: older_or_equal(a, b) = a.timestamp < b.timestamp OR 
 *           (a.timestamp == b.timestamp AND a.event_id <= b.event_id)
 */
export function olderOrEqual(a: CursorKey, b: CursorKey): boolean {
    if (a.timestamp < b.timestamp) return true;
    if (a.timestamp === b.timestamp && a.eventId <= b.eventId) return true;
    return false;
}

// --- Mock Implementation ---

class MockDataSource implements DataSource {
    private readonly events = [...MOCK_EVENTS].sort((a, b) => b.timestamp - a.timestamp); // DESC

    async getGatewayStatus(): Promise<GatewayStatus> {
        return MOCK_GATEWAY_STATUS;
    }

    async getMe(): Promise<UserProfile> {
        return {
            id: "principal_mock_admin",
            email: "admin@talos.io",
            roles: ["admin"],
            permissions: ["*"]
        };
    }

    // LLM Management
    async listUpstreams(): Promise<Upstream[]> {
        return [
            { id: "openai-main", provider: "openai", endpoint: "https://api.openai.com/v1", credentials_ref: "secret:openai", tags: { tier: "pro" }, enabled: true, version: 1 },
            { id: "anthropic-backup", provider: "anthropic", endpoint: "https://api.anthropic.com/v1", credentials_ref: "secret:anthropic", tags: { tier: "fallback" }, enabled: true, version: 1 }
        ];
    }
    async createUpstream(_data: Partial<Upstream>): Promise<Upstream> { return { ..._data, version: 1 } as Upstream; }
    async updateUpstream(_id: string, _data: Partial<Upstream>, _expectedVersion: number): Promise<Upstream> { 
        return { ..._data, id: _id, version: _expectedVersion + 1 } as Upstream; 
    }
    async deleteUpstream(_id: string): Promise<void> {}

    async listModelGroups(): Promise<ModelGroup[]> {
        return [
            { id: "gpt-4-prod", name: "GPT-4 Production", deployments: [], fallback_groups: [], routing_policy_id: "default", enabled: true, version: 1 }
        ];
    }
    async createModelGroup(_data: Partial<ModelGroup>): Promise<ModelGroup> { return { ..._data, version: 1 } as ModelGroup; }
    async updateModelGroup(_id: string, _data: Partial<ModelGroup>, _expectedVersion: number): Promise<ModelGroup> {
        return { ..._data, id: _id, version: _expectedVersion + 1 } as ModelGroup;
    }
    async deleteModelGroup(_id: string): Promise<void> {}

    // MCP Management
    async listMcpServers(): Promise<McpServer[]> {
        return [
            { id: "filesystem", name: "Filesystem", endpoint: "stdio://cat", enabled: true, version: 1 }
        ];
    }
    async createMcpServer(_data: Partial<McpServer>): Promise<McpServer> { return { ..._data, version: 1 } as McpServer; }
    async updateMcpServer(_id: string, _data: Partial<McpServer>, _expectedVersion: number): Promise<McpServer> {
        return { ..._data, id: _id, version: _expectedVersion + 1 } as McpServer;
    }
    async deleteMcpServer(_id: string): Promise<void> {}

    async listMcpPolicies(_teamId?: string): Promise<McpPolicy[]> {
        return [
            { id: "pol_1", team_id: "engineering", allowed_servers: ["filesystem"], allowed_tools: ["*"] }
        ];
    }
    async upsertMcpPolicy(_data: Partial<McpPolicy>): Promise<McpPolicy> { return _data as McpPolicy; }
    async deleteMcpPolicy(_id: string): Promise<void> {}

    // Secrets Management
    async listSecrets(): Promise<Secret[]> {
        return [
            { name: "openai-key", kek_id: "kek-v1", created_at: new Date().toISOString() },
            { name: "anthropic-key", kek_id: "kek-v1", created_at: new Date().toISOString() },
        ];
    }
    async createSecret(_name: string, _value: string): Promise<void> {}
    async deleteSecret(_name: string): Promise<void> {}
    async getKekStatus(): Promise<KekStatus> {
        return { current_kek_id: "kek-v1-mock", loaded_kek_ids: ["kek-v1-mock"], stale_counts: { "kek-v0": 0 } };
    }
    async rotateAllSecrets(): Promise<RotationOperation> {
        return { id: "op-mock-" + Date.now(), status: "completed", target_kek_id: "kek-v1-mock", stats: { scanned: 2, rotated: 2, failed: 0 }, started_at: new Date().toISOString() };
    }
    async getRotationStatus(opId: string): Promise<RotationOperation> {
        return { id: opId, status: "completed", target_kek_id: "kek-v1-mock", stats: { scanned: 2, rotated: 2, failed: 0 }, started_at: new Date().toISOString() };
    }

    // Config Management
    async exportConfig(): Promise<ConfigExport> {
        return { upstreams: {}, model_groups: {}, routing_policies: {} };
    }
    async applyConfig(_config: ConfigExport): Promise<void> {}

    // RBAC Management
    async listRbacRoles(): Promise<RbacRole[]> {
        return [
            { role_id: "role-admin", name: "Admin", permissions: ["*:*"], built_in: true, description: "Full platform access" },
            { role_id: "role-viewer", name: "Viewer", permissions: ["llm:read", "audit:read"], built_in: true, description: "Read-only access" },
        ];
    }
    async upsertRbacRole(role: RbacRole): Promise<RbacRole> { return role; }
    async deleteRbacRole(_roleId: string): Promise<void> {}

    async listRbacBindings(): Promise<RbacBinding[]> {
        return [
            { 
                principal_id: "dev-user", 
                bindings: [
                    { 
                        binding_id: "bind_admin", 
                        role_id: "role-admin", 
                        scope: { scope_type: "global", attributes: {} } 
                    }
                ] 
            }
        ];
    }
    async upsertRbacBinding(binding: RbacBinding): Promise<RbacBinding> { return binding; }
    async deleteRbacBinding(_principalId: string): Promise<void> {}

    async chatCompletion(_apiKey: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
        return {
            id: "chat-mock-" + Date.now(),
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: (body.model as string) || "mock-model",
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: "This is a mock response from the Talos Dashboard. Playground is connected via MockDataSource."
                },
                finish_reason: "stop"
            }],
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
        };
    }

    async getStats(): Promise<DashboardStats> {
        const now = Math.floor(Date.now() / 1000);
        const from = now - 24 * 3600;
        const inRange = this.events.filter(e => e.timestamp >= from && e.timestamp <= now);

        // Compute Counts
        const total = inRange.length;
        const ok = inRange.filter(e => e.outcome === "OK").length;

        const denial_counts: Record<string, number> = {};
        inRange.filter(e => e.outcome === "DENY").forEach(e => {
            const reason = e.denial_reason || "UNKNOWN";
            denial_counts[reason] = (denial_counts[reason] || 0) + 1;
        });

        // Mock Series (Hourly buckets)
        const seriesMap = new Map<number, { ok: number, deny: number, error: number }>();
        inRange.forEach(e => {
            const bucket = Math.floor(e.timestamp / 3600) * 3600;
            if (!seriesMap.has(bucket)) seriesMap.set(bucket, { ok: 0, deny: 0, error: 0 });
            const entry = seriesMap.get(bucket)!;
            if (e.outcome === "OK") entry.ok++;
            else if (e.outcome === "DENY") entry.deny++;
            else entry.error++;
        });

        return {
            requests_24h: total,
            tokens_24h: total * 500, // Mock 500 tokens per request
            cost_24h: total * 0.0075, // Mock $0.0075 per request
            auth_success_rate: total > 0 ? ok / total : 1,
            denial_reason_counts: denial_counts,
            request_volume_series: Array.from(seriesMap.entries())
                .map(([time, data]) => ({ time, ...data }))
                .sort((a, b) => a.time - b.time),
            latency_percentiles: { p50: 5, p95: 12, p99: 45 }, // Mocked
            latency_avg: 7.5,
        };
    }

    async listAuditEvents({ limit, cursor, filters }: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>> {
        let subset = this.events;

        // Apply Filters
        if (filters) {
            if (filters.outcome) subset = subset.filter(e => e.outcome === filters.outcome);
            if (filters.session_id) subset = subset.filter(e => e.session_id === filters.session_id);
            if (filters.correlation_id) subset = subset.filter(e => e.correlation_id === filters.correlation_id);
            if (filters.denial_reason) subset = subset.filter(e => e.denial_reason === filters.denial_reason);
        }

        // Apply Cursor (Pagination)
        if (cursor) {
            const decoded = decodeCursorCompat(cursor);
            if (decoded) {
                // Find split point: Older than timestamp (DESC)
                // Or same timestamp but smaller ID
                subset = subset.filter(e => {
                    if (e.timestamp < decoded.timestamp) return true;
                    if (e.timestamp === decoded.timestamp && e.event_id < decoded.eventId) return true;
                    return false;
                });
            }
        }

        const items = subset.slice(0, limit);
        const lastItem = items.at(-1);

        return {
            items,
            next_cursor: lastItem ? deriveCursor(lastItem.timestamp, lastItem.event_id) : undefined,
            has_more: subset.length > limit,
        };
    }

    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void {
        // Mock live stream: emit a random event every 5 seconds
        const interval = setInterval(() => {
            const randomEvent = this.events[Math.floor(Math.random() * this.events.length)];

            // Apply Filters
            if (filters) {
                if (filters.session_id && randomEvent.session_id !== filters.session_id) return;
                if (filters.outcome && randomEvent.outcome !== filters.outcome) return;
                if (filters.correlation_id && randomEvent.correlation_id !== filters.correlation_id) return;
            }

            // Clone and bump timestamp to make it "new"
            const newEvent: AuditEvent = {
                ...randomEvent,
                event_id: `evt_live_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000),
                cursor: deriveCursor(Math.floor(Date.now() / 1000), `evt_live_${Date.now()}`)
            };
            cb({ type: "audit_event", event: newEvent });
        }, 5000);
        return () => clearInterval(interval);
    }
}

// --- SQLite Implementation (DEV ONLY) ---

export class SqliteDataSource implements DataSource {
    constructor() {
        if (process.env.NODE_ENV !== "development") {
            throw new Error("SECURITY: SqliteDataSource is unrestricted and allowed in DEVELOPMENT MODE ONLY.");
        }
        console.warn("⚠️  Using SqliteDataSource (Fixture Playback Mode)");
    }

    async getGatewayStatus(): Promise<GatewayStatus> {
        return MOCK_GATEWAY_STATUS;
    }

    async getMe(): Promise<UserProfile> {
        return new MockDataSource().getMe();
    }

    async listUpstreams(): Promise<Upstream[]> { return new MockDataSource().listUpstreams(); }
    async createUpstream(data: Partial<Upstream>): Promise<Upstream> { return new MockDataSource().createUpstream(data); }
    async updateUpstream(id: string, data: Partial<Upstream>, expectedVersion: number): Promise<Upstream> { return new MockDataSource().updateUpstream(id, data, expectedVersion); }
    async deleteUpstream(id: string): Promise<void> { return new MockDataSource().deleteUpstream(id); }

    async listModelGroups(): Promise<ModelGroup[]> { return new MockDataSource().listModelGroups(); }
    async createModelGroup(data: Partial<ModelGroup>): Promise<ModelGroup> { return new MockDataSource().createModelGroup(data); }
    async updateModelGroup(id: string, data: Partial<ModelGroup>, expectedVersion: number): Promise<ModelGroup> { return new MockDataSource().updateModelGroup(id, data, expectedVersion); }
    async deleteModelGroup(id: string): Promise<void> { return new MockDataSource().deleteModelGroup(id); }

    async listMcpServers(): Promise<McpServer[]> { return new MockDataSource().listMcpServers(); }
    async createMcpServer(data: Partial<McpServer>): Promise<McpServer> { return new MockDataSource().createMcpServer(data); }
    async updateMcpServer(id: string, data: Partial<McpServer>, expectedVersion: number): Promise<McpServer> { return new MockDataSource().updateMcpServer(id, data, expectedVersion); }
    async deleteMcpServer(id: string): Promise<void> { return new MockDataSource().deleteMcpServer(id); }

    async listMcpPolicies(teamId?: string): Promise<McpPolicy[]> { return new MockDataSource().listMcpPolicies(teamId); }
    async upsertMcpPolicy(data: Partial<McpPolicy>): Promise<McpPolicy> { return new MockDataSource().upsertMcpPolicy(data); }
    async deleteMcpPolicy(id: string): Promise<void> { return new MockDataSource().deleteMcpPolicy(id); }

    // Secrets Management
    async listSecrets(): Promise<Secret[]> { return new MockDataSource().listSecrets(); }
    async createSecret(name: string, value: string): Promise<void> { return new MockDataSource().createSecret(name, value); }
    async deleteSecret(name: string): Promise<void> { return new MockDataSource().deleteSecret(name); }
    async getKekStatus(): Promise<KekStatus> { return new MockDataSource().getKekStatus(); }
    async rotateAllSecrets(): Promise<RotationOperation> { return new MockDataSource().rotateAllSecrets(); }
    async getRotationStatus(opId: string): Promise<RotationOperation> { return new MockDataSource().getRotationStatus(opId); }

    // Config Management
    async exportConfig(): Promise<ConfigExport> { return new MockDataSource().exportConfig(); }
    async applyConfig(config: ConfigExport): Promise<void> { return new MockDataSource().applyConfig(config); }

    // RBAC Management
    async listRbacRoles(): Promise<RbacRole[]> { return new MockDataSource().listRbacRoles(); }
    async upsertRbacRole(role: RbacRole): Promise<RbacRole> { return new MockDataSource().upsertRbacRole(role); }
    async deleteRbacRole(roleId: string): Promise<void> { return new MockDataSource().deleteRbacRole(roleId); }

    async listRbacBindings(): Promise<RbacBinding[]> { return new MockDataSource().listRbacBindings(); }
    async upsertRbacBinding(binding: RbacBinding): Promise<RbacBinding> { return new MockDataSource().upsertRbacBinding(binding); }
    async deleteRbacBinding(principalId: string): Promise<void> { return new MockDataSource().deleteRbacBinding(principalId); }

    async chatCompletion(apiKey: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
        return new MockDataSource().chatCompletion(apiKey, body);
    }

    async getStats(): Promise<DashboardStats> {
        return new MockDataSource().getStats(); // Fallback to mock for now
    }

    async listAuditEvents(params: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>> {
        return new MockDataSource().listAuditEvents(params); // Fallback
    }

    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void {
        return new MockDataSource().subscribe(cb, filters);
    }
}

// --- Factory ---

// Default to HTTP (production mode) unless explicitly set to MOCK for development
const mode = (process.env.NEXT_PUBLIC_TALOS_DATA_MODE || "HTTP") as DataMode;

export function createDataSource(mode: DataMode): DataSource {
    switch (mode) {
        case "HTTP": return new HttpDataSource();
        case "SQLITE": return new SqliteDataSource();
        case "MOCK": return new MockDataSource();
        default: return new HttpDataSource(); // Production default
    }
}

export const dataSource: DataSource = createDataSource(mode);

if (mode === "SQLITE" && process.env.NODE_ENV !== "development") {
    console.error("CRITICAL: Attempted to load SQLite adapter in non-dev environment. Falling back to HTTP.");
}

// Log current mode for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[Talos Dashboard] Data Source Mode: ${mode}`);
}
