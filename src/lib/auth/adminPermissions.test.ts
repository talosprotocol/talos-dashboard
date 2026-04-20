import { describe, expect, it, vi } from "vitest";
import { ADMIN_READ_PERMISSIONS, getAdminProxyPermissions } from "./adminPermissions";

vi.mock("server-only", () => ({}));

describe("adminPermissions", () => {
  it("uses route-specific read permissions for read-only routes", () => {
    expect(getAdminProxyPermissions("GET", "llm/upstreams")).toEqual(["llm.read"]);
    expect(getAdminProxyPermissions("GET", "mcp/servers")).toEqual(["mcp.read"]);
    expect(getAdminProxyPermissions("GET", "audit/stats")).toEqual(["audit.read"]);
    expect(getAdminProxyPermissions("GET", "secrets")).toEqual(["keys.read"]);
  });

  it("keeps the shared read set for read-only routes without a concrete owner", () => {
    expect(getAdminProxyPermissions("GET", "gateway/status")).toEqual(ADMIN_READ_PERMISSIONS);
    expect(getAdminProxyPermissions("GET", "me")).toEqual(ADMIN_READ_PERMISSIONS);
  });

  it("adds llm admin permission for mutating llm routes", () => {
    expect(getAdminProxyPermissions("POST", "llm/upstreams")).toEqual(
      expect.arrayContaining(["llm.admin"]),
    );
    expect(getAdminProxyPermissions("PATCH", "llm/model-groups/123")).toEqual(
      expect.arrayContaining(["llm.admin"]),
    );
  });

  it("adds mcp admin and delete permissions for mutating mcp routes", () => {
    expect(getAdminProxyPermissions("DELETE", "mcp/servers/abc")).toEqual(
      expect.arrayContaining(["mcp.admin", "resource.delete"]),
    );
  });

  it("adds key write permission for secret mutations", () => {
    expect(getAdminProxyPermissions("POST", "secrets")).toEqual(
      expect.arrayContaining(["keys.write"]),
    );
  });
});
