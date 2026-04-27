// Background Web Worker for prefetching dashboard data

type FetchTarget = 'stats' | 'events' | 'gateway_status' | 'all';
type JsonObject = Record<string, unknown>;
type WorkerContext = {
  location: Location;
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerMessage>) => void): void;
};

interface WorkerMessage {
  type: 'PREFETCH_INIT' | 'REFRESH';
  target?: FetchTarget;
}

const CACHE: {
  stats: JsonObject | null;
  events: unknown;
  gatewayStatus: unknown;
} = {
  stats: null,
  events: null,
  gatewayStatus: null
};

// Use self to refer to the worker global scope
const ctx = self as unknown as WorkerContext;

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

async function fetchStats() {
  let usageStats: JsonObject | null = null;
  let auditStats: JsonObject | null = null;
  const origin = self.location.origin;
  
  try {
    const res1 = await fetch(new URL('/api/admin/v1/telemetry/stats?window_hours=24', origin).toString());
    if (res1.ok) {
      const data = await res1.json();
      usageStats = isRecord(data) ? data : null;
    }
  } catch {}

  try {
    const res2 = await fetch(new URL('/api/admin/v1/audit/stats?window_hours=24', origin).toString());
    if (res2.ok) {
      const data = await res2.json();
      auditStats = isRecord(data) ? data : null;
    }
  } catch {}

  let successRate = 1.0;
  const requests24h = numberValue(auditStats?.requests_24h);
  const denialCounts = isRecord(auditStats?.denial_reason_counts) ? auditStats.denial_reason_counts : {};
  if (requests24h > 0) {
      const totalDenials = Object.values(denialCounts).reduce<number>(
        (sum, value) => sum + numberValue(value),
        0,
      );
      successRate = (requests24h - totalDenials) / requests24h;
  }

  const result = {
      requests_24h: requests24h || numberValue(usageStats?.requests_total),
      tokens_24h: numberValue(usageStats?.tokens_total),
      cost_24h: numberValue(usageStats?.cost_usd),
      latency_avg: numberValue(usageStats?.latency_avg_ms),
      auth_success_rate: successRate, 
      denial_reason_counts: denialCounts,
      request_volume_series: auditStats?.request_volume_series ?? [],
      latency_percentiles: auditStats?.latency_percentiles ?? { p50: 10, p95: 20, p99: 50 },
  };
  CACHE.stats = result;
  return result;
}

async function fetchEvents() {
  try {
    const origin = self.location.origin;
    const url = new URL('/api/admin/v1/audit/events?limit=20', origin);
    const res = await fetch(url.toString());
    if (res.ok) {
        const data = await res.json();
        CACHE.events = data;
        return data;
    }
  } catch (e) { console.error("Worker fetch events fail", e) }
  return null;
}

async function fetchGatewayStatus() {
  try {
      const origin = self.location.origin;
      const res = await fetch(new URL('/api/admin/v1/gateway/status', origin).toString());
      if (res.ok) {
          const data = await res.json();
          CACHE.gatewayStatus = data;
          return data;
      }
  } catch {}
  return null;
}

async function performFetch(target: FetchTarget) {
    const promises = [];
    
    if (target === 'all' || target === 'stats') promises.push(fetchStats().then(data => data && ctx.postMessage({ type: 'DATA_STATS', payload: data })));
    if (target === 'all' || target === 'events') promises.push(fetchEvents().then(data => data && ctx.postMessage({ type: 'DATA_EVENTS', payload: data })));
    if (target === 'all' || target === 'gateway_status') promises.push(fetchGatewayStatus().then(data => data && ctx.postMessage({ type: 'DATA_GATEWAY_STATUS', payload: data })));

    await Promise.allSettled(promises);
}

ctx.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, target } = event.data;
  
  if (type === 'PREFETCH_INIT') {
      // First boot: return whatever is in cache immediately (might be null initially)
      if (CACHE.stats) ctx.postMessage({ type: 'DATA_STATS', payload: CACHE.stats });
      if (CACHE.events) ctx.postMessage({ type: 'DATA_EVENTS', payload: CACHE.events });
      if (CACHE.gatewayStatus) ctx.postMessage({ type: 'DATA_GATEWAY_STATUS', payload: CACHE.gatewayStatus });
      
      // Then re-fetch all
      performFetch('all');
  } 
  else if (type === 'REFRESH') {
      performFetch(target || 'all');
  }
});
