import { describe, expect, it } from "vitest";
import {
  buildManifestResponse,
  loadExamplesManifest,
  type ManifestDocument,
} from "../../lib/examples-manifest";

describe("examples manifest helpers", () => {
  it("falls back to the monorepo contracts manifest path", async () => {
    const result = await loadExamplesManifest({
      cwd: "/repo/site/dashboard",
      readFile: async (candidatePath) => {
        if (candidatePath === "/repo/site/dashboard/contracts/examples_manifest.json") {
          const error = new Error("missing");
          Object.assign(error, { code: "ENOENT" });
          throw error;
        }
        if (candidatePath === "/repo/contracts/examples_manifest.json") {
          return JSON.stringify({ version: "1", examples: [] });
        }
        throw new Error(`unexpected path: ${candidatePath}`);
      },
    });

    expect(result.sourcePath).toBe("/repo/contracts/examples_manifest.json");
    expect(result.manifest.version).toBe("1");
  });

  it("adds timestamped online, offline, and not-configured statuses", async () => {
    const manifest: ManifestDocument = {
      version: "1",
      examples: [
        {
          id: "secure-chat",
          title: "Secure Chat",
          description: "chat",
          route: "/examples/chat",
          backend: {
            type: "http",
            env: "TALOS_CHAT_URL",
            health: "/health",
          },
        },
        {
          id: "devops-agent",
          title: "DevOps",
          description: "devops",
          route: "/examples/devops",
          backend: {
            type: "http",
            env: "TALOS_AIOPS_URL",
            health: "/health",
          },
        },
        {
          id: "missing",
          title: "Missing",
          description: "missing",
          route: "/examples/missing",
          backend: {
            type: "http",
            env: "UNSET_URL",
            health: "/health",
          },
        },
      ],
    };

    const response = await buildManifestResponse(
      manifest,
      "/repo/contracts/examples_manifest.json",
      {
        TALOS_CHAT_URL: "http://chat.local:8100",
        TALOS_AIOPS_URL: "http://aiops.local:8200",
      },
      async (input) => ({
        ok: input === "http://chat.local:8100/health",
      }),
    );

    expect(response.source_path).toBe("/repo/contracts/examples_manifest.json");
    expect(typeof response.timestamp).toBe("number");
    expect(response.examples.map((example) => example.status)).toEqual([
      "online",
      "offline",
      "not-configured",
    ]);
  });
});
