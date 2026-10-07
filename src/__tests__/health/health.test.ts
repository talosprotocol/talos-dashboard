import { describe, expect, it, vi } from "vitest";
import {
  checkConfig,
  checkDatabase,
  getBuildInfo,
  getReadinessReport,
  renderPrometheusMetrics,
} from "../../lib/health";

vi.mock("server-only", () => ({}));

describe("dashboard health helpers", () => {
  it("marks missing required config as not ready", () => {
    const result = checkConfig({
      APP_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000",
    });

    expect(result.status).toBe("fail");
    expect(result.missing_required).toContain("NEXT_PUBLIC_RP_ID");
    expect(result.missing_required).toContain("AUTH_COOKIE_HMAC_SECRET");
  });

  it("treats auth bootstrap env as recommended, not required", () => {
    const result = checkConfig({
      APP_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_RP_ID: "localhost",
      AUTH_COOKIE_HMAC_SECRET: "secret",
    });

    expect(result.status).toBe("pass");
    expect(result.missing_recommended).toContain("AUTH_SECRET");
    expect(result.missing_recommended).toContain("TALOS_BOOTSTRAP_TOKEN");
  });

  it("rejects missing or weak authentication secrets in production readiness", () => {
    const missing = checkConfig({ NODE_ENV: "production" });
    expect(missing.status).toBe("fail");
    expect(missing.missing_required).toContain("AUTH_ADMIN_SECRET");

    const weak = checkConfig({
      NODE_ENV: "production",
      APP_ORIGIN: "https://talos.example",
      NEXT_PUBLIC_APP_ORIGIN: "https://talos.example",
      NEXT_PUBLIC_RP_ID: "talos.example",
      AUTH_COOKIE_HMAC_SECRET:
        "ZGV2LXRhbG9zLWRhc2hib2FyZC1jb29raWUtc2lnbmluZy1zZWNyZXQ",
      AUTH_SECRET: "production_secret_change_me_in_prod_env",
      ADMIN_PASSWORD: "talos_secure_start",
      AUTH_ADMIN_SECRET: "dev-admin-secret",
    });
    expect(weak.status).toBe("fail");
    expect(weak.invalid_required).toEqual([
      "AUTH_SECRET",
      "ADMIN_PASSWORD",
      "AUTH_ADMIN_SECRET",
      "AUTH_COOKIE_HMAC_SECRET",
    ]);
  });

  it("marks production auth configuration ready when every secret meets policy", () => {
    const result = checkConfig({
      NODE_ENV: "production",
      APP_ORIGIN: "https://talos.example",
      NEXT_PUBLIC_APP_ORIGIN: "https://talos.example",
      NEXT_PUBLIC_RP_ID: "talos.example",
      AUTH_SECRET: "s".repeat(32),
      ADMIN_PASSWORD: "p".repeat(16),
      AUTH_ADMIN_SECRET: "a".repeat(32),
      AUTH_COOKIE_HMAC_SECRET: "A".repeat(43),
    });

    expect(result.status).toBe("pass");
    expect(result.missing_required).toEqual([]);
    expect(result.invalid_required).toEqual([]);
  });

  it("checks database readiness with latency reporting", async () => {
    const result = await checkDatabase({
      query: async (_sql: string) => ({ rows: [{ "?column?": 1 }] }),
    });

    expect(result.status).toBe("pass");
    expect(typeof result.latency_ms).toBe("number");
  });

  it("builds a not_ready report when database check fails", async () => {
    const report = await getReadinessReport(
      {
        APP_ORIGIN: "http://localhost:3000",
        NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000",
        NEXT_PUBLIC_RP_ID: "localhost",
        AUTH_COOKIE_HMAC_SECRET: "secret",
        VERSION: "1.2.3",
      },
      {
        query: async () => {
          throw new Error("db unavailable");
        },
      },
    );

    expect(report.status).toBe("not_ready");
    expect(report.checks.config.status).toBe("pass");
    expect(report.checks.database.status).toBe("fail");
    expect(report.build.version).toBe("1.2.3");
  });

  it("renders prometheus metrics for the report", () => {
    const metrics = renderPrometheusMetrics({
      status: "ready",
      service: "talos-dashboard",
      build: getBuildInfo({
        VERSION: "9.9.9",
        GIT_SHA: "abc123",
        BUILD_TIME: "2026-03-15T00:00:00Z",
      }),
      checks: {
        config: {
          status: "pass",
          missing_required: [],
          invalid_required: [],
          missing_recommended: ["AUTH_SECRET"],
        },
        database: {
          status: "pass",
          latency_ms: 7,
        },
      },
    });

    expect(metrics).toContain("talos_dashboard_ready 1");
    expect(metrics).toContain("talos_dashboard_config_missing_recommended 1");
    expect(metrics).toContain('version="9.9.9"');
  });
});
