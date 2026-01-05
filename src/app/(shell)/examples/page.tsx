"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/**
 * Examples Catalog - Interactive Demo Hub
 * 
 * Lists available Talos examples from the manifest. Each example
 * is a separate application demonstrating protocol capabilities.
 * 
 * Note: Examples require their backends to be running separately.
 */

type ExampleStatus = "online" | "offline" | "not-configured";

interface Example {
    id: string;
    title: string;
    description: string;
    route: string;
    status: ExampleStatus;
    backend: {
        type: "http";
        env: string;
        health: string;
        runtime_hint?: string;
    };
}

interface ManifestResponse {
    version: string;
    examples: Example[];
    timestamp: number;
    code?: string;
}

export default function ExamplesPage() {
    const [data, setData] = useState<ManifestResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchManifest = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/examples/manifest");
            const json = await res.json();
            if (json.code) {
                setError(json.code);
                setData(null);
            } else {
                setData(json);
                setError(null);
            }
        } catch {
            setError("FETCH_FAILED");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        queueMicrotask(fetchManifest);
    }, [fetchManifest]);

    const getHeaderText = (manifest: ManifestResponse | null, isLoading: boolean): string => {
        if (manifest) return `${manifest.examples.length} examples available`;
        if (isLoading) return "Loading...";
        return "";
    };

    return (

        <div className="space-y-6">
            {/* Demo Banner */}
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                <strong>Demo Environment:</strong> These are interactive demonstrations of Talos Protocol.
                Backends must be started separately.
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--text-muted)]">
                    {getHeaderText(data, loading)}
                </div>

                <button
                    onClick={fetchManifest}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50"
                >
                    {loading ? "Checking..." : "Refresh"}
                </button>
            </div>

            {/* Error State */}
            {error && (
                <GlassPanel className="p-5 border-red-500/20">
                    <p className="text-red-500 text-sm">
                        Failed to load examples manifest: <code>{error}</code>
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-2">
                        Ensure submodules are initialized: <code>git submodule update --init</code>
                    </p>
                </GlassPanel>
            )}

            {/* Examples Grid */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.examples.map((example) => (
                        <ExampleCard key={example.id} example={example} />
                    ))}
                </div>
            )}
        </div>
    );
}

const STATUS_STYLES: Record<ExampleStatus, { bg: string; text: string; label: string }> = {
    online: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "ONLINE" },
    offline: { bg: "bg-red-500/10", text: "text-red-500", label: "OFFLINE" },
    "not-configured": { bg: "bg-gray-500/10", text: "text-gray-500", label: "NOT CONFIGURED" },
};

function ExampleCard({ example }: Readonly<{ example: Example }>) {
    const style = STATUS_STYLES[example.status] || STATUS_STYLES["not-configured"];
    const isActive = example.status === "online";

    return (
        <GlassPanel className="p-6 flex flex-col justify-between h-52">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{example.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                    </span>
                </div>
                <p className="text-[var(--text-muted)] text-sm">
                    {example.description}
                </p>
                {example.backend.runtime_hint && (
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        <span className="font-mono">{example.backend.runtime_hint}</span>
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between mt-4">
                {isActive ? (
                    <Link
                        href={example.route}
                        className="inline-flex items-center text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                        Launch Demo →
                    </Link>
                ) : (
                    <span className="text-sm font-semibold opacity-30 cursor-not-allowed">
                        Launch Demo →
                    </span>
                )}
                <span className="text-xs font-mono text-[var(--text-muted)]">
                    {example.backend.env}
                </span>
            </div>
        </GlassPanel>
    );
}
