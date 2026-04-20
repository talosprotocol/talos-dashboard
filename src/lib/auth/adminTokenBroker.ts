import "server-only";

import { AUTH_ADMIN_SECRET, TALOS_GATEWAY_URL } from "../config";

const ADMIN_TOKEN_BROKER_PATH = "/admin/v1/auth/token";
const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 30_000;
const DEFAULT_TTL_SECONDS = 300;

type TokenBrokerRequest = {
  principal: string;
  permissions: readonly string[];
  ttlSeconds?: number;
  sessionId?: string;
};

type TokenBrokerResponse = {
  token?: string;
  permissions?: string[];
  session_id?: string;
  expires_in?: number;
  expires_at?: string;
};

type TokenCacheEntry = {
  token: string;
  expiresAtMs: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();
const inflightRequests = new Map<string, Promise<string>>();

function normalizePermissions(permissions: readonly string[]): string[] {
  return [...new Set(permissions)].sort();
}

function cacheKey(input: TokenBrokerRequest): string {
  return JSON.stringify({
    principal: input.principal,
    permissions: normalizePermissions(input.permissions),
    sessionId: input.sessionId ?? "",
  });
}

function cacheEntryFresh(entry: TokenCacheEntry): boolean {
  return Date.now() < entry.expiresAtMs - TOKEN_EXPIRY_SAFETY_WINDOW_MS;
}

function parseExpiresAtMs(response: TokenBrokerResponse, ttlSeconds: number): number {
  if (typeof response.expires_in === "number" && Number.isFinite(response.expires_in)) {
    return Date.now() + response.expires_in * 1000;
  }

  if (typeof response.expires_at === "string") {
    const parsed = Date.parse(response.expires_at);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now() + ttlSeconds * 1000;
}

async function fetchBrokeredToken(input: TokenBrokerRequest): Promise<string> {
  const permissions = normalizePermissions(input.permissions);
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const url = new URL(ADMIN_TOKEN_BROKER_PATH, TALOS_GATEWAY_URL);

  const body: Record<string, unknown> = {
    principal: input.principal,
    permissions,
    ttl_seconds: ttlSeconds,
  };

  if (input.sessionId) {
    body.session_id = input.sessionId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Talos-Admin-Secret": AUTH_ADMIN_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Admin token broker request failed (${response.status}): ${errorText || response.statusText}`,
    );
  }

  const data = (await response.json()) as TokenBrokerResponse;
  if (!data.token) {
    throw new Error("Admin token broker response missing token");
  }

  const expiresAtMs = parseExpiresAtMs(data, ttlSeconds);
  tokenCache.set(cacheKey(input), { token: data.token, expiresAtMs });

  return data.token;
}

export async function getBrokeredAdminToken(input: TokenBrokerRequest): Promise<string> {
  const key = cacheKey(input);
  const cached = tokenCache.get(key);
  if (cached && cacheEntryFresh(cached)) {
    return cached.token;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight;
  }

  const request = fetchBrokeredToken(input);
  inflightRequests.set(key, request);

  try {
    return await request;
  } finally {
    inflightRequests.delete(key);
  }
}

export function clearAdminTokenBrokerCacheForTests(): void {
  tokenCache.clear();
  inflightRequests.clear();
}
