type AuthEnv = Record<string, string | undefined>;

export const AUTH_BYPASS_HEADER = "x-talos-auth";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") return undefined;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

export type DashboardAuthMode = {
  required: boolean;
  source: string;
};

export function resolveDashboardAuthMode(env: AuthEnv = process.env): DashboardAuthMode {
  const authRequired = readBoolean(env.TALOS_AUTH_REQUIRED);
  if (authRequired !== undefined) {
    return { required: authRequired, source: "TALOS_AUTH_REQUIRED" };
  }

  const publicAuthRequired = readBoolean(env.NEXT_PUBLIC_TALOS_AUTH_REQUIRED);
  if (publicAuthRequired !== undefined) {
    return { required: publicAuthRequired, source: "NEXT_PUBLIC_TALOS_AUTH_REQUIRED" };
  }

  const legacyDisableLogin = readBoolean(env.TALOS_DISABLE_LOGIN);
  if (legacyDisableLogin !== undefined) {
    return { required: !legacyDisableLogin, source: "TALOS_DISABLE_LOGIN" };
  }

  const publicLegacyDisableLogin = readBoolean(env.NEXT_PUBLIC_DISABLE_LOGIN);
  if (publicLegacyDisableLogin !== undefined) {
    return { required: !publicLegacyDisableLogin, source: "NEXT_PUBLIC_DISABLE_LOGIN" };
  }

  return { required: false, source: "default-local-bypass" };
}

export function isDashboardAuthRequired(env: AuthEnv = process.env): boolean {
  return resolveDashboardAuthMode(env).required;
}

export function isDashboardAuthDisabled(env: AuthEnv = process.env): boolean {
  return !isDashboardAuthRequired(env);
}
