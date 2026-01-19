import "server-only"; // Next.js guard - prevents client import

export const DATA_SOURCE_MODE = (process.env.NEXT_PUBLIC_TALOS_DATA_MODE || process.env.DATA_SOURCE_MODE || 'HTTP') as 'MOCK' | 'HTTP';

// These URLs are NEVER exposed to client
export const TALOS_AUDIT_URL = process.env.TALOS_AUDIT_URL || 'http://localhost:8001';
export const TALOS_GATEWAY_URL = process.env.TALOS_GATEWAY_URL || 'http://localhost:8000';
export const TALOS_CONNECTOR_URL = process.env.TALOS_CONNECTOR_URL || 'http://localhost:8082';
export const TALOS_CHAT_URL = process.env.TALOS_CHAT_URL || 'http://localhost:8100';
