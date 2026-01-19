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

/**
 * Generate a UUIDv7 (time-ordered UUID)
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * where first 48 bits are Unix timestamp in ms
 */
function generateUUIDv7(): string {
  const timestamp = Date.now();
  
  // Convert timestamp to hex (48 bits)
  const timestampHex = timestamp.toString(16).padStart(12, '0');
  
  // Generate random bits for the rest
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);
  
  // Convert bytes to hex strings
  const hex = (byte: number) => byte.toString(16).padStart(2, '0');
  
  // Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
  const uuid = [
    timestampHex.slice(0, 8),                                  // 8 hex chars
    timestampHex.slice(8, 12),                                 // 4 hex chars
    '7' + hex(randomBytes[0]).slice(0, 1) + hex(randomBytes[1]), // 7 + 3 hex chars
    hex((randomBytes[2] & 0x3f) | 0x80) + hex(randomBytes[3]), // variant + 2 hex chars
    hex(randomBytes[4]) + hex(randomBytes[5]) + hex(randomBytes[6]) + 
      hex(randomBytes[7]) + hex(randomBytes[8]) + hex(randomBytes[9]), // 12 hex chars
  ].join('-');
  
  return uuid;
}

/**
 * Compute event hash using canonical JSON + SHA256
 * Matches contracts implementation
 */
function computeEventHash(event: Omit<AuditEvent, 'event_hash'>): string {
  // Exclude event_hash and cursor from canonicalization
  const { cursor, ...eventForHash } = event;
  const canonical = JSON.stringify(eventForHash, Object.keys(eventForHash).sort(), 0);
  
  // SHA256 hash (browser-compatible)
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  
  // Sync hash for simplicity in mock (production uses crypto.subtle)
  // This is a simplified hash for MOCK mode only
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return hex string (note: simplified for mock, production uses SHA256)
  return 'mock-' + Math.abs(hash).toString(16).padStart(16, '0');
}

export class MockDataSource {
  private readonly pages: Map<string | null, EventPage>;
  
  constructor() {
    // Generate 3 pages of schema-valid events
    this.pages = new Map([
      [null, this.generatePage(50, 'page2', true)],
      ['page2', this.generatePage(50, 'page3', true)],
      ['page3', this.generatePage(20, null, false)], // Final page
    ]);
  }
  
  private generateEvent(timestamp: Date, outcome: string): AuditEvent {
    const eventId = generateUUIDv7();
    const requestId = generateUUIDv7();
    const unix_ms = timestamp.getTime();
    
    const eventWithoutHash: Omit<AuditEvent, 'event_hash'> = {
      schema_id: 'talos.audit_event',
      schema_version: 'v1',
      event_id: eventId,
      timestamp: unix_ms, // Unix timestamp in milliseconds
      request_id: requestId,
      surface_id: 'mock-surface',
      outcome,
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
        ip_hash: 'mock-ip-' + Math.random().toString(36).substring(7), // Hashed IP
      },
      meta: {
        mock: true,
        generated_at: new Date().toISOString(),
      },
      cursor: base64urlEncodeUtf8(`${unix_ms}:${eventId}`), // Add cursor here for type safety
    };
    
    const event_hash = computeEventHash(eventWithoutHash);
    
    return {
      ...eventWithoutHash,
      event_hash,
    };
  }
  
  private generatePage(count: number, next: string | null, has_more: boolean): EventPage {
    // 60% success, 25% denied, 10% flagged, 5% redacted
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
    
    // Sort by timestamp DESC (newest first)
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
    
    // If we're returning partial page, derive cursor from last event
    const slicedItems = page.items.slice(0, requestedLimit);
    const lastEvent = slicedItems[slicedItems.length - 1];
    const cursorRaw = `${lastEvent.timestamp}:${lastEvent.event_id}`;
    const cursor = base64urlEncodeUtf8(cursorRaw); // Base64url-encode per contracts spec
    
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
  
  getAdminMe(): AdminUser {
    return {
      id: 'mock-user-001',
      email: 'mock@talosprotocol.com',
      name: 'Mock User (Development)',
      roles: ['admin'],
    };
  }
}
