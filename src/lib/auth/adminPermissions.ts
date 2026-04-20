import "server-only";

export const ADMIN_READ_PERMISSIONS = [
  "llm.read",
  "mcp.read",
  "audit.read",
  "keys.read",
] as const;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const READ_PERMISSION_BY_ROOT: Record<string, string> = {
  audit: "audit.read",
  catalog: "llm.read",
  llm: "llm.read",
  mcp: "mcp.read",
  secrets: "keys.read",
  telemetry: "audit.read",
  usage: "llm.read",
};

function uniquePermissions(permissions: readonly string[]): string[] {
  return [...new Set(permissions)];
}

function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

function rootSegment(path: string): string {
  return path.replace(/^\/+/, "").split("/")[0] ?? "";
}

/**
 * Resolve the broker permissions for a dashboard-admin proxy route.
 */
export function getAdminProxyPermissions(method: string, path: string): string[] {
  const permissions = new Set<string>(ADMIN_READ_PERMISSIONS);
  const root = rootSegment(path);

  if (!isMutatingMethod(method)) {
    const readPermission = READ_PERMISSION_BY_ROOT[root];
    return readPermission ? [readPermission] : uniquePermissions([...permissions]);
  }

  if (root === "llm") {
    permissions.add("llm.admin");
  } else if (root === "mcp") {
    permissions.add("mcp.admin");
  } else if (root === "secrets") {
    permissions.add("keys.write");
  } else {
    permissions.add("platform.admin");
  }

  if (method.toUpperCase() === "DELETE") {
    permissions.add("resource.delete");
  }

  return uniquePermissions([...permissions]);
}
