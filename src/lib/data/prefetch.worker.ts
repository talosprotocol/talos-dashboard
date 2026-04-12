// Background Web Worker for prefetching dashboard data
// @ts-nocheck

type FetchTarget = 'stats' | 'events' | 'gateway_status' | 'all';

interface WorkerMessage {
  type: 'PREFETCH_INIT' | 'REFRESH';
  target?: FetchTarget;
}

const CACHE: Record<string, any> = {
  stats: null,
  events: null,
  gatewayStatus: null
};

// Use self to refer to the worker global scope
const ctx: Worker = self as any;

async function fetchStats() {
  let usageStats = null;
  let auditStats = null;
  
  try {
    const res1 = await fetch('/api/admin/v1/telemetry/stats?window_hours=24');
    if (res1.ok) usageStats = await res1.json();
  } catch (e) {}

  try {
    const res2 = await fetch('/api/admin/v1/audit/stats?window_hours=24');
    if (res2.ok) auditStats = await res2.json();
  } catch (e) {}

  let successRate = 1.0;
  if (auditStats && auditStats.requests_24h > 0) {
      const totalDenials = Object.values(auditStats.denial_reason_counts || {}).reduce((a: any, b: any) => a + b, 0);
      successRate = (auditStats.requests_24h - totalDenials) / auditStats.requests_24h;
  }

  const result = {
      requests_24h: auditStats?.requests_24h ?? usageStats?.requests_total ?? 0,
      tokens_24h: usageStats?.tokens_total ?? 0,
      cost_24h: usageStats?.cost_usd ?? 0,
      latency_avg: usageStats?.latency_avg_ms ?? 0,
      auth_success_rate: successRate, 
      denial_reason_counts: auditStats?.denial_reason_counts ?? {},
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
      const res = await fetch('/api/admin/v1/gateway/status');
      if (res.ok) {
          const data = await res.json();
          CACHE.gatewayStatus = data;
          return data;
      }
  } catch (e) {}
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
