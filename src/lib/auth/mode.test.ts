import { describe, expect, it } from "vitest";
import { isDashboardAuthDisabled, resolveDashboardAuthMode } from "./mode";

describe("dashboard auth mode", () => {
  it("disables login by default for local dashboard work", () => {
    expect(isDashboardAuthDisabled({})).toBe(true);
    expect(resolveDashboardAuthMode({})).toEqual({
      required: false,
      source: "default-local-bypass",
    });
  });

  it("enables login when the production auth flag is set", () => {
    expect(isDashboardAuthDisabled({ TALOS_AUTH_REQUIRED: "true" })).toBe(false);
  });

  it("keeps the legacy disable-login flag working", () => {
    expect(isDashboardAuthDisabled({ TALOS_DISABLE_LOGIN: "true" })).toBe(true);
    expect(isDashboardAuthDisabled({ TALOS_DISABLE_LOGIN: "false" })).toBe(false);
  });

  it("lets the new flag override the legacy flag when both are set", () => {
    expect(
      resolveDashboardAuthMode({
        TALOS_AUTH_REQUIRED: "true",
        TALOS_DISABLE_LOGIN: "true",
      }),
    ).toEqual({
      required: true,
      source: "TALOS_AUTH_REQUIRED",
    });
  });
});
