import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

describe('GET /api/status', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV_MODE', 'true');
    vi.stubEnv('NEXT_PUBLIC_TALOS_DATA_MODE', 'HTTP');
    vi.stubEnv('TALOS_GATEWAY_URL', 'http://gateway.test');
    vi.stubEnv('TALOS_AUDIT_URL', 'http://audit.test');
    vi.stubEnv('TALOS_CONNECTOR_URL', 'http://connector.test');
    vi.stubEnv('TALOS_CHAT_URL', 'http://chat.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses each service health endpoint and configured base URL', async () => {
    const { GET } = await import('./route');
    const response = await GET({} as NextRequest);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(4);
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
      'http://chat.test/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
