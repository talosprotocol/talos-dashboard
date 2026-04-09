import fs from "node:fs/promises";
import path from "node:path";

export type ExampleStatus = "online" | "offline" | "not-configured";

export interface ManifestExample {
  id: string;
  title: string;
  description: string;
  route: string;
  backend: {
    type: "http";
    env: string;
    health: string;
    runtime_hint?: string;
  };
  ui?: {
    env?: string;
    default_path?: string;
  };
  features?: string[];
}

export interface ManifestDocument {
  version: string;
  examples: ManifestExample[];
}

export interface ManifestResponse extends ManifestDocument {
  timestamp: number;
  source_path: string;
  examples: Array<ManifestExample & { status: ExampleStatus }>;
}

type ReadFile = (path: string, encoding: BufferEncoding) => Promise<string>;
type FetchResult = { ok: boolean };
type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResult>;

const MANIFEST_CANDIDATES = [
  ["contracts", "examples_manifest.json"],
  ["..", "..", "contracts", "examples_manifest.json"],
] as const;

export class ManifestLoadError extends Error {
  constructor(
    public readonly code: string,
    public readonly details: Record<string, unknown>,
  ) {
    super(code);
  }
}

function getCandidatePaths(cwd: string): string[] {
  return MANIFEST_CANDIDATES.map((parts) => path.resolve(cwd, ...parts));
}

function buildHealthUrl(baseUrl: string, healthPath: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedHealth = healthPath.startsWith("/") ? healthPath.slice(1) : healthPath;
  return new URL(normalizedHealth, normalizedBase).toString();
}

export async function loadExamplesManifest({
  cwd = process.cwd(),
  readFile = fs.readFile,
}: {
  cwd?: string;
  readFile?: ReadFile;
} = {}): Promise<{ manifest: ManifestDocument; sourcePath: string }> {
  const candidatePaths = getCandidatePaths(cwd);

  for (const candidatePath of candidatePaths) {
    try {
      const fileContent = await readFile(candidatePath, "utf-8");
      try {
        return {
          manifest: JSON.parse(fileContent) as ManifestDocument,
          sourcePath: candidatePath,
        };
      } catch {
        throw new ManifestLoadError("TALOS_INVALID_MANIFEST", {
          path: candidatePath,
          reason: "JSON parse failed",
        });
      }
    } catch (error) {
      if (error instanceof ManifestLoadError) {
        throw error;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        continue;
      }
      throw new ManifestLoadError("TALOS_INTERNAL_ERROR", {
        path: candidatePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new ManifestLoadError("TALOS_MISSING_DEPENDENCY", {
    paths: candidatePaths,
    reason: "Canonical examples manifest missing",
  });
}

export async function getExampleStatus(
  example: ManifestExample,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<ExampleStatus> {
  const baseUrl = env[example.backend.env];
  if (!baseUrl) {
    return "not-configured";
  }

  try {
    const response = await fetchImpl(buildHealthUrl(baseUrl, example.backend.health), {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function buildManifestResponse(
  manifest: ManifestDocument,
  sourcePath: string,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<ManifestResponse> {
  const examples = await Promise.all(
    manifest.examples.map(async (example) => ({
      ...example,
      status: await getExampleStatus(example, env, fetchImpl),
    })),
  );

  return {
    version: manifest.version,
    examples,
    source_path: sourcePath,
    timestamp: Date.now(),
  };
}
