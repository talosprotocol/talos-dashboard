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
    expect(isDashboardAuthDisabled({ TALOS_AUTH_REQUIRED: "true" })).toBe(
      false,
    );
  });

  it("requires authentication in production even when auth is explicitly disabled", () => {
    expect(
      resolveDashboardAuthMode({
        NODE_ENV: "production",
        TALOS_AUTH_REQUIRED: "false",
      }),
    ).toEqual({ required: true, source: "production-enforced" });
    expect(isDashboardAuthDisabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isDashboardAuthDisabled({
        TALOS_ENV: "staging",
        TALOS_AUTH_REQUIRED: "false",
      }),
    ).toBe(false);
  });

  it("keeps the legacy disable-login flag working", () => {
    expect(isDashboardAuthDisabled({ TALOS_DISABLE_LOGIN: "true" })).toBe(true);
    expect(isDashboardAuthDisabled({ TALOS_DISABLE_LOGIN: "false" })).toBe(
      false,
    );
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
