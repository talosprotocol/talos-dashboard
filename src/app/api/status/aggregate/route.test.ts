import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('GET /api/status/aggregate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_TALOS_DATA_MODE', 'HTTP');
    vi.stubEnv('TALOS_GATEWAY_URL', 'http://gateway.test');
    vi.stubEnv('TALOS_AUDIT_URL', 'http://audit.test');
    vi.stubEnv('TALOS_CONNECTOR_URL', 'http://connector.test');
    vi.stubEnv('TALOS_GOVERNANCE_URL', 'http://governance.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the configured URLs and service-specific health paths', async () => {
    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(body.aggregateStatus).toBe('healthy');
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/health/ready',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetch).toHaveBeenCalledWith(
      'http://audit.test/health',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetch).toHaveBeenCalledWith(
      'http://connector.test/health',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetch).toHaveBeenCalledWith(
      'http://governance.test/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
