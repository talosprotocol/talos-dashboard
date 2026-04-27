/**
 * Contract-valid mock data source
 * Events generated with proper event_hash using contracts helper
 */

import { base64urlEncodeUtf8 } from '@talosprotocol/contracts';

interface AuditEvent {
  schema_id: string;
  schema_version: string;
  event_id: string;
  timestamp: number; // Unix timestamp in milliseconds
  request_id: string;
  surface_id: string;
  outcome: string;
  principal: Record<string, unknown>;
  http: Record<string, unknown>;
  meta: Record<string, unknown>;
  resource?: Record<string, unknown>;
  event_hash: string;
  cursor: string; // Derived cursor for frontend sorting/navigation
  hashes?: {
    event_hash?: string;
    request_hash?: string;
    response_hash?: string;
  };
  integrity?: {
    proof_state: string;
    signature_state: string;
    anchor_state: string;
    verifier_version: string;
    failure_reason?: string;
  };
  method?: string;
  event_type?: string;
  peer_id?: string;
  agent_id?: string;
  denial_reason?: string;
}

interface EventPage {
  items: AuditEvent[];
  next_cursor: string | null;
  has_more: boolean;
}

interface ServiceStatus {
  state: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MOCK';
  latency_ms?: number;
  error_code?: string;
  error_message?: string;
}

interface StatusResponse {
  services: {
    gateway: ServiceStatus;
    audit: ServiceStatus;
    connector: ServiceStatus;
    chat: ServiceStatus;
  };
  timestamp: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface BudgetScope {
  scope_type: string;
  scope_id: string;
  limit_usd: string;
  used_usd: string;
  reserved_usd: string;
  period_start?: string;
}

interface VirtualKey {
  id: string;
  team_id: string;
  budget_mode: string;
  budget: {
    limit_usd: string;
  };
  overdraft_usd: string;
  revoked: boolean;
}

interface Team {
  id: string;
  name: string;
  budget_mode: string;
  budget: {
    limit_usd: string;
  };
  overdraft_usd: string;
}

/**
 * Generate a UUIDv7 (time-ordered UUID)
 */
function generateUUIDv7(): string {
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).padStart(12, '0');
  
  // Use crypto from global if available, else require it
  let cryptoObj: any = typeof crypto !== 'undefined' ? crypto : null;
  if (!cryptoObj && typeof require !== 'undefined') {
    try {
      cryptoObj = require('node:crypto').webcrypto;
    } catch {
      // Fallback
    }
  }

  const randomBytes = new Uint8Array(10);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(randomBytes);
  } else {
    // Math.random fallback for environments without webcrypto
    for (let i = 0; i < 10; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  
  const hex = (byte: number) => byte.toString(16).padStart(2, '0');
  
  return [
    timestampHex.slice(0, 8),
    timestampHex.slice(8, 12),
    '7' + hex(randomBytes[0]).slice(0, 1) + hex(randomBytes[1]),
    hex((randomBytes[2] & 0x3f) | 0x80) + hex(randomBytes[3]),
    hex(randomBytes[4]) + hex(randomBytes[5]) + hex(randomBytes[6]) + 
      hex(randomBytes[7]) + hex(randomBytes[8]) + hex(randomBytes[9]),
  ].join('-');
}

/**
 * Compute event hash
 */
function computeEventHash(event: Omit<AuditEvent, 'event_hash'>): string {
  const { cursor: _cursor, ...eventForHash } = event;
  const canonical = JSON.stringify(eventForHash, Object.keys(eventForHash).sort(), 0);
  
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << 5) - hash) + canonical.charCodeAt(i);
    hash = hash & hash;
  }
  
  return 'mock-' + Math.abs(hash).toString(16).padStart(16, '0');
}

export class MockDataSource {
  private readonly pages: Map<string | null, EventPage>;
  
  constructor() {
    this.pages = new Map([
      [null, this.generatePage(50, 'page2', true)],
      ['page2', this.generatePage(50, 'page3', true)],
      ['page3', this.generatePage(20, null, false)],
    ]);
  }
  
  private generateEvent(timestamp: Date, outcome: string): AuditEvent {
    const eventId = generateUUIDv7();
    const requestId = generateUUIDv7();
    const unix_s = Math.floor(timestamp.getTime() / 1000);
    
    const eventWithoutHash: Omit<AuditEvent, 'event_hash'> = {
      schema_id: 'talos.audit_event',
      schema_version: 'v1',
      event_id: eventId,
      timestamp: unix_s,
      request_id: requestId,
      surface_id: 'mock-surface',
      outcome: outcome === 'success' ? 'OK' : (outcome === 'denied' ? 'DENY' : 'ERROR'),
      event_type: 'AUTHORIZATION',
      method: 'llm.chat',
      principal: {
        type: 'user',
        id: `mock-user-${Math.floor(Math.random() * 100)}@talosprotocol.com`,
      },
      resource: {
        type: 'api',
        path: `/api/example/${Math.floor(Math.random() * 10)}`,
      },
      http: {
        method: 'GET',
        status_code: outcome === 'success' ? 200 : 403,
        ip_hash: 'mock-ip-' + Math.random().toString(36).substring(7),
      },
      meta: {
        mock: true,
        generated_at: new Date().toISOString(),
      },
      hashes: {
        event_hash: 'mock-event-hash',
        request_hash: 'mock-req-hash',
      },
      integrity: {
        proof_state: "VERIFIED",
        signature_state: "VALID",
        anchor_state: "NOT_ENABLED",
        verifier_version: "3.2"
      },
      cursor: base64urlEncodeUtf8(`${unix_s}:${eventId}`),
    };
    
    const event_hash = computeEventHash(eventWithoutHash);
    
    return {
      ...eventWithoutHash,
      event_hash,
    };
  }
  
  private generatePage(count: number, next: string | null, has_more: boolean): EventPage {
    const outcomes = [
      ...Array(60).fill('success'),
      ...Array(25).fill('denied'),
      ...Array(10).fill('flagged'),
      ...Array(5).fill('redacted'),
    ];
    
    const items = Array.from({ length: count }, (_, i) => {
      const hoursAgo = Math.floor(i / 10) + Math.random() * 2;
      const timestamp = new Date(Date.now() - hoursAgo * 3600000);
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      return this.generateEvent(timestamp, outcome);
    });
    
    items.sort((a, b) => b.timestamp - a.timestamp);
    return { items, next_cursor: next, has_more };
  }
  
  listEvents({ limit = 50, before = null }: { limit?: number; before?: string | null }): EventPage {
    const page = this.pages.get(before);
    if (!page) {
      return { items: [], next_cursor: null, has_more: false };
    }
    
    const requestedLimit = Math.min(Math.max(1, limit), 200);
    if (requestedLimit >= page.items.length) {
      return page;
    }
    
    const slicedItems = page.items.slice(0, requestedLimit);
    const lastEvent = slicedItems[slicedItems.length - 1];
    const cursor = base64urlEncodeUtf8(`${lastEvent.timestamp}:${lastEvent.event_id}`);
    
    return {
      items: slicedItems,
      next_cursor: cursor,
      has_more: true,
    };
  }
  
  getStatus(): StatusResponse {
    return {
      services: {
        gateway: { state: 'MOCK', latency_ms: 0 },
        audit: { state: 'MOCK', latency_ms: 0 },
        connector: { state: 'OFFLINE', latency_ms: 0, error_code: 'MOCK_MODE' },
        chat: { state: 'OFFLINE', latency_ms: 0, error_code: 'MOCK_MODE' },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getGatewayStatus(): Promise<any> {
    return {
      schema_version: "1",
      status_seq: 1,
      state: "RUNNING",
      version: "0.1.27",
      uptime_seconds: 3600,
      requests_processed: 1250,
      tenants: 1,
      cache: {
        capability_cache_size: 10,
        hits: 100,
        misses: 2,
        evictions: 0
      },
      sessions: {
        active_sessions: 5,
        replay_rejections_1h: 0
      }
    };
  }
  
  getAdminMe(): AdminUser {
    return {
      id: 'mock-user-001',
      email: 'mock@talosprotocol.com',
      name: 'Mock User (Development)',
      roles: ['admin'],
    };
  }

  async listAuditEvents(params: { limit?: number; before?: string | null }): Promise<EventPage> {
    return this.listEvents(params);
  }

  async listMcpPolicies(teamId?: string): Promise<any[]> {
    return [
      { id: "pol_1", team_id: teamId || "engineering", allowed_servers: ["filesystem"], allowed_tools: ["*"] }
    ];
  }

  async listBudgetScopes(): Promise<BudgetScope[]> {
    return [
      { scope_type: "global", scope_id: "platform", limit_usd: "100.00", used_usd: "42.50", reserved_usd: "5.00", period_start: new Date().toISOString().slice(0, 10) },
      { scope_type: "team", scope_id: "engineering", limit_usd: "50.00", used_usd: "12.20", reserved_usd: "1.50", period_start: new Date().toISOString().slice(0, 10) },
    ];
  }

  async listVirtualKeys(): Promise<VirtualKey[]> {
    return [
      { id: "key_prod_1", team_id: "engineering", budget_mode: "hard", budget: { limit_usd: "10.00" }, overdraft_usd: "0.00", revoked: false },
      { id: "key_dev_2", team_id: "engineering", budget_mode: "soft", budget: { limit_usd: "5.00" }, overdraft_usd: "2.10", revoked: false },
    ];
  }

  async listTeams(): Promise<Team[]> {
    return [
      { id: "engineering", name: "Engineering Core", budget_mode: "hard", budget: { limit_usd: "50.00" }, overdraft_usd: "0.00" },
    ];
  }
}
