import "server-only";

import dashboardPkg from "../../package.json";
import { pool } from "../db";

type EnvMap = Record<string, string | undefined>;

export type HealthCheckStatus = "pass" | "fail";

export interface BuildInfo {
  service: string;
  version: string;
  gitSha: string;
  buildTime: string;
  timestamp: string;
}

export interface ConfigCheck {
  status: HealthCheckStatus;
  missing_required: string[];
  invalid_required: string[];
  missing_recommended: string[];
}

export interface DatabaseCheck {
  status: HealthCheckStatus;
  latency_ms?: number;
  error?: string;
}

export interface ReadinessReport {
  status: "ready" | "not_ready";
  service: string;
  checks: {
    config: ConfigCheck;
    database: DatabaseCheck;
  };
  build: BuildInfo;
}

type Queryable = { query: (sql: string) => Promise<unknown> };

const REQUIRED_ENV_VARS = [
  "APP_ORIGIN",
  "NEXT_PUBLIC_APP_ORIGIN",
  "NEXT_PUBLIC_RP_ID",
  "AUTH_COOKIE_HMAC_SECRET",
] as const;

const RECOMMENDED_ENV_VARS = ["AUTH_SECRET", "TALOS_BOOTSTRAP_TOKEN"] as const;
const PRODUCTION_SECRET_MIN_LENGTHS: Record<string, number> = {
  AUTH_SECRET: 32,
  ADMIN_PASSWORD: 16,
  AUTH_ADMIN_SECRET: 32,
  AUTH_COOKIE_HMAC_SECRET: 43,
};
const KNOWN_WEAK_SECRETS = new Set([
  "changeme_local_auth_secret",
  "changeme_local_admin_secret",
  "dev-admin-secret",
  "talos_secure_start",
  "production_secret_change_me_in_prod_env",
  "ZGV2LXRhbG9zLWRhc2hib2FyZC1jb29raWUtc2lnbmluZy1zZWNyZXQ",
]);

function missingEnvVars(names: readonly string[], env: EnvMap): string[] {
  return names.filter((name) => !env[name]);
}

export function getBuildInfo(env: EnvMap = process.env): BuildInfo {
  return {
    service: "talos-dashboard",
    version:
      env.VERSION || env.npm_package_version || dashboardPkg.version || "0.0.0",
    gitSha: env.GIT_SHA || "unknown",
    buildTime: env.BUILD_TIME || "unknown",
    timestamp: new Date().toISOString(),
  };
}

export function checkConfig(env: EnvMap = process.env): ConfigCheck {
  const production =
    env.NODE_ENV === "production" ||
    env.TALOS_ENV === "production" ||
    env.TALOS_ENV === "staging";
  const requiredVars = production
    ? [...REQUIRED_ENV_VARS, ...Object.keys(PRODUCTION_SECRET_MIN_LENGTHS)]
    : REQUIRED_ENV_VARS;
  const missing_required = missingEnvVars(requiredVars, env);
  const invalid_required = production
    ? Object.entries(PRODUCTION_SECRET_MIN_LENGTHS)
        .filter(([name, minLength]) => {
          const value = env[name]?.trim();
          const malformedCookieSecret =
            name === "AUTH_COOKIE_HMAC_SECRET" &&
            value !== undefined &&
            !/^[A-Za-z0-9_-]{43,}$/.test(value);
          return Boolean(
            value &&
            (value.length < minLength ||
              malformedCookieSecret ||
              KNOWN_WEAK_SECRETS.has(value)),
          );
        })
        .map(([name]) => name)
    : [];
  const missing_recommended = missingEnvVars(RECOMMENDED_ENV_VARS, env);

  return {
    status:
      missing_required.length === 0 && invalid_required.length === 0
        ? "pass"
        : "fail",
    missing_required,
    invalid_required,
    missing_recommended,
  };
}

export async function checkDatabase(
  dbPool: Queryable = pool,
): Promise<DatabaseCheck> {
  const started = Date.now();
  try {
    await dbPool.query("select 1");
    return {
      status: "pass",
      latency_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getReadinessReport(
  env: EnvMap = process.env,
  dbPool: Queryable = pool,
): Promise<ReadinessReport> {
  const config = checkConfig(env);
  const database = await checkDatabase(dbPool);
  const ready = config.status === "pass" && database.status === "pass";

  return {
    status: ready ? "ready" : "not_ready",
    service: "talos-dashboard",
    checks: {
      config,
      database,
    },
    build: getBuildInfo(env),
  };
}

export function renderPrometheusMetrics(report: ReadinessReport): string {
  const { build, checks, status } = report;
  const metrics = [
    "# HELP talos_dashboard_build_info Build metadata for the dashboard package.",
    "# TYPE talos_dashboard_build_info gauge",
    `talos_dashboard_build_info{service="${build.service}",version="${build.version}",git_sha="${build.gitSha}",build_time="${build.buildTime}"} 1`,
    "# HELP talos_dashboard_ready Dashboard readiness status.",
    "# TYPE talos_dashboard_ready gauge",
    `talos_dashboard_ready ${status === "ready" ? 1 : 0}`,
    "# HELP talos_dashboard_config_ready Required configuration is present.",
    "# TYPE talos_dashboard_config_ready gauge",
    `talos_dashboard_config_ready ${checks.config.status === "pass" ? 1 : 0}`,
    "# HELP talos_dashboard_config_missing_required Count of missing required environment variables.",
    "# TYPE talos_dashboard_config_missing_required gauge",
    `talos_dashboard_config_missing_required ${checks.config.missing_required.length}`,
    "# HELP talos_dashboard_config_missing_recommended Count of missing recommended environment variables.",
    "# TYPE talos_dashboard_config_missing_recommended gauge",
    `talos_dashboard_config_missing_recommended ${checks.config.missing_recommended.length}`,
    "# HELP talos_dashboard_db_up Database connectivity status.",
    "# TYPE talos_dashboard_db_up gauge",
    `talos_dashboard_db_up ${checks.database.status === "pass" ? 1 : 0}`,
  ];

  if (typeof checks.database.latency_ms === "number") {
    metrics.push(
      "# HELP talos_dashboard_db_latency_ms Database readiness probe latency in milliseconds.",
      "# TYPE talos_dashboard_db_latency_ms gauge",
      `talos_dashboard_db_latency_ms ${checks.database.latency_ms}`,
    );
  }

  return `${metrics.join("\n")}\n`;
}
