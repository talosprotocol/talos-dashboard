import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * GET /api/examples/manifest
 * 
 * Returns the examples catalog from the submodule.
 * Validates against schema contract and returns taxonomy errors.
 */

interface ExampleBackend {
    type: "http";
    env: string;
    health: string;
    runtime_hint?: string;
}

interface Example {
    id: string;
    title: string;
    description: string;
    route: string;
    backend: ExampleBackend;
}

interface Manifest {
    version: string;
    examples: Example[];
}

export async function GET() {
    const manifestPath = path.join(
        process.cwd(),
        "submodules",
        "examples",
        "examples_manifest.json"
    );

    try {
        if (!existsSync(manifestPath)) {
            return NextResponse.json(
                {
                    code: "TALOS_NOT_FOUND",
                    details: { resource: "examples_manifest.json" },
                    timestamp: Date.now(),
                },
                {
                    status: 404,
                    headers: { "Cache-Control": "no-store" },
                }
            );
        }

        const content = readFileSync(manifestPath, "utf-8");
        let manifest: Manifest;

        try {
            manifest = JSON.parse(content);
        } catch {
            return NextResponse.json(
                {
                    code: "TALOS_INVALID_CONFIG",
                    details: { reason: "invalid_json" },
                    timestamp: Date.now(),
                },
                {
                    status: 500,
                    headers: { "Cache-Control": "no-store" },
                }
            );
        }

        // Basic validation
        if (!manifest.version || !Array.isArray(manifest.examples)) {
            return NextResponse.json(
                {
                    code: "TALOS_INVALID_CONFIG",
                    details: { reason: "missing_required_fields" },
                    timestamp: Date.now(),
                },
                {
                    status: 500,
                    headers: { "Cache-Control": "no-store" },
                }
            );
        }

        // Check backend health for each example
        const examplesWithStatus = await Promise.all(
            manifest.examples.map(async (example) => {
                const envUrl = process.env[example.backend.env];
                let status: "online" | "offline" | "not-configured" = "not-configured";

                if (envUrl) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const res = await fetch(`${envUrl}${example.backend.health}`, {
                            signal: controller.signal,
                            cache: "no-store",
                        });
                        clearTimeout(timeoutId);
                        status = res.ok ? "online" : "offline";
                    } catch {
                        status = "offline";
                    }
                }

                return { ...example, status };
            })
        );

        return NextResponse.json(
            {
                version: manifest.version,
                examples: examplesWithStatus,
                timestamp: Date.now(),
            },
            {
                headers: { "Cache-Control": "no-store" },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                code: "TALOS_INTERNAL_ERROR",
                details: { message: error instanceof Error ? error.message : "Unknown error" },
                timestamp: Date.now(),
            },
            {
                status: 500,
                headers: { "Cache-Control": "no-store" },
            }
        );
    }
}
