import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("admin token broker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("requests a broker token with the configured secret and caches by identity key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "token-1",
          permissions: ["audit.read"],
          session_id: "session-1",
          expires_in: 120,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TALOS_GATEWAY_URL", "http://gateway.local:8000");
    vi.stubEnv("AUTH_ADMIN_SECRET", "broker-secret");

    const { getBrokeredAdminToken, clearAdminTokenBrokerCacheForTests } = await import(
      "./adminTokenBroker"
    );

    clearAdminTokenBrokerCacheForTests();

    const first = await getBrokeredAdminToken({
      principal: "user-1",
      permissions: ["audit.read"],
      ttlSeconds: 300,
      sessionId: "session-1",
    });
    const second = await getBrokeredAdminToken({
      principal: "user-1",
      permissions: ["audit.read"],
      ttlSeconds: 300,
      sessionId: "session-1",
    });

    expect(first).toBe("token-1");
    expect(second).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://gateway.local:8000/admin/v1/auth/token");
    expect(init?.headers).toMatchObject({
      "X-Talos-Admin-Secret": "broker-secret",
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    expect(JSON.parse(String(init?.body))).toEqual({
      principal: "user-1",
      permissions: ["audit.read"],
      ttl_seconds: 300,
      session_id: "session-1",
    });
  });

  it("misses the cache when the session changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "token-1", expires_in: 120 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "token-2", expires_in: 120 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TALOS_GATEWAY_URL", "http://gateway.local:8000");
    vi.stubEnv("AUTH_ADMIN_SECRET", "broker-secret");

    const { getBrokeredAdminToken, clearAdminTokenBrokerCacheForTests } = await import(
      "./adminTokenBroker"
    );

    clearAdminTokenBrokerCacheForTests();

    const first = await getBrokeredAdminToken({
      principal: "user-1",
      permissions: ["audit.read"],
      ttlSeconds: 300,
      sessionId: "session-a",
    });
    const second = await getBrokeredAdminToken({
      principal: "user-1",
      permissions: ["audit.read"],
      ttlSeconds: 300,
      sessionId: "session-b",
    });

    expect(first).toBe("token-1");
    expect(second).toBe("token-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
