"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useCallback, useEffect, useState } from "react";

type ExampleStatus = "online" | "offline" | "not-configured";

interface DevOpsExample {
  id: string;
  title: string;
  description: string;
  route: string;
  status: ExampleStatus;
  features?: string[];
  backend: {
    env: string;
    health: string;
    runtime_hint?: string;
  };
}

interface ManifestResponse {
  examples: DevOpsExample[];
}

const STATUS_COPY: Record<
  ExampleStatus,
  { label: string; className: string; summary: string }
> = {
  online: {
    label: "ONLINE",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    summary: "The configured DevOps example backend responded to its health endpoint.",
  },
  offline: {
    label: "OFFLINE",
    className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
    summary: "The backend URL is configured, but its health endpoint is not responding cleanly.",
  },
  "not-configured": {
    label: "NOT CONFIGURED",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400",
    summary: "Set the backend URL env var before trying the DevOps example locally.",
  },
};

export default function DevOpsExamplePage() {
  const [example, setExample] = useState<DevOpsExample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadExample = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/examples/manifest", { cache: "no-store" });
      const payload = (await response.json()) as ManifestResponse & { code?: string };
      if (!response.ok || payload.code) {
        setError(payload.code ?? "TALOS_UNAVAILABLE");
        setExample(null);
        return;
      }

      const current = payload.examples.find((item) => item.route === "/examples/devops");
      if (!current) {
        setError("TALOS_EXAMPLE_NOT_FOUND");
        setExample(null);
        return;
      }

      setExample(current);
      setError(null);
    } catch {
      setError("FETCH_FAILED");
      setExample(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadExample);
  }, [loadExample]);

  const status = example ? STATUS_COPY[example.status] : null;

  return (
    <div className="space-y-6">
      <div className="px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
        This route now matches the contracts manifest and dashboard catalog. The deeper DevOps trigger, logs,
        and status backend contract is still tracked separately.
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DevOps Agent Demo</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Catalog-backed example metadata plus backend availability for the AIOps demo surface.
          </p>
        </div>
        <button
          onClick={loadExample}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <GlassPanel className="p-5 border-red-500/20">
          <p className="text-sm text-red-500">
            Failed to load the DevOps example metadata: <code>{error}</code>
          </p>
        </GlassPanel>
      )}

      {example && status && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          <GlassPanel className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{example.title}</h2>
                <p className="text-sm text-[var(--text-muted)]">{example.description}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel)]/70 p-4">
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Route</div>
                <div className="mt-2 font-mono">{example.route}</div>
              </div>
              <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel)]/70 p-4">
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Backend Env</div>
                <div className="mt-2 font-mono">{example.backend.env}</div>
              </div>
              <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel)]/70 p-4">
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Health Path</div>
                <div className="mt-2 font-mono">{example.backend.health}</div>
              </div>
              <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel)]/70 p-4">
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Runtime Hint</div>
                <div className="mt-2 font-mono">{example.backend.runtime_hint ?? "n/a"}</div>
              </div>
            </div>

            <p className="text-sm text-[var(--text-muted)]">{status.summary}</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Example Features
            </h3>
            {example.features && example.features.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {example.features.map((feature) => (
                  <li key={feature} className="rounded-md border border-[var(--glass-border)] bg-[var(--panel)]/70 px-3 py-2 font-mono">
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">No feature metadata declared.</p>
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
