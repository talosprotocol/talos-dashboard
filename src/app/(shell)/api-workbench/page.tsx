"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Braces, Play, Search, Sparkles } from "lucide-react";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  API_WORKBENCH_ROUTES,
  type ApiWorkbenchRoute,
  type HttpMethod,
  parseApiWorkbenchBody,
  resolveApiWorkbenchPath,
} from "@/lib/api/workbench";

type ResponseState = {
  status: number | null;
  contentType: string;
  body: string;
};

function buildInitialParams(route: ApiWorkbenchRoute): Record<string, string> {
  return Object.fromEntries(
    (route.params ?? []).map((param) => [param.name, param.defaultValue ?? ""]),
  );
}

function inferInitialMethod(route: ApiWorkbenchRoute): HttpMethod {
  return route.defaultMethod ?? route.methods[0];
}

function formatResponseBody(raw: string, contentType: string): string {
  if (contentType.includes("application/json")) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return raw;
}

export default function ApiWorkbenchPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState(API_WORKBENCH_ROUTES[0].id);
  const selectedRoute =
    API_WORKBENCH_ROUTES.find((route) => route.id === selectedId) ??
    API_WORKBENCH_ROUTES[0];

  const [method, setMethod] = useState<HttpMethod>(inferInitialMethod(selectedRoute));
  const [params, setParams] = useState<Record<string, string>>(
    buildInitialParams(selectedRoute),
  );
  const [body, setBody] = useState(selectedRoute.bodyTemplate ?? "");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponseState>({
    status: null,
    contentType: "application/json",
    body: "Select a route and execute it from the dashboard shell.",
  });

  useEffect(() => {
    setMethod(inferInitialMethod(selectedRoute));
    setParams(buildInitialParams(selectedRoute));
    setBody(selectedRoute.bodyTemplate ?? "");
    setError(null);
  }, [selectedRoute]);

  const filteredRoutes = API_WORKBENCH_ROUTES.filter((route) => {
    const haystack = `${route.title} ${route.path} ${route.group} ${route.description}`.toLowerCase();
    return haystack.includes(deferredSearch.trim().toLowerCase());
  });

  const resolvedPath = resolveApiWorkbenchPath(selectedRoute, params);

  const runRequest = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const parsedBody = parseApiWorkbenchBody(method, body);
      const res = await fetch(resolvedPath, {
        method,
        headers: parsedBody
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
        body: parsedBody,
      });

      const contentType = res.headers.get("content-type") ?? "text/plain";
      const raw = await res.text();
      const formatted = formatResponseBody(raw, contentType);

      startTransition(() => {
        setResponse({
          status: res.status,
          contentType,
          body: formatted || "(empty response body)",
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      startTransition(() => {
        setResponse({
          status: null,
          contentType: "text/plain",
          body: message,
        });
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Workbench"
        subtitle="Every dashboard-owned API route is callable from the shell."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <GlassPanel className="border-white/8 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by route, title, or group"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {filteredRoutes.map((route) => {
              const active = route.id === selectedRoute.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedId(route.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 shadow-[0_0_24px_var(--accent-glow)]"
                      : "border-white/6 bg-white/[0.02] hover:border-white/14 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {route.group}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {route.title}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {route.methods.join("/")}
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
                    {route.path}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <GlassPanel className="border-white/8 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {selectedRoute.group}
                </div>
                <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {selectedRoute.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                  {selectedRoute.description}
                </p>
                <div className="mt-3 font-mono text-xs text-[var(--text-muted)]">
                  {resolvedPath}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as HttpMethod)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-primary)] outline-none"
                >
                  {selectedRoute.methods.map((routeMethod) => (
                    <option key={routeMethod} value={routeMethod}>
                      {routeMethod}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void runRequest()}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-primary)] transition hover:bg-[var(--accent)]/18 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isRunning ? "Running" : "Execute"}
                </button>
              </div>
            </div>

            {(selectedRoute.params?.length ?? 0) > 0 && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {selectedRoute.params?.map((param) => (
                  <label key={param.name} className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {param.label}
                    </span>
                    <input
                      value={params[param.name] ?? ""}
                      onChange={(event) =>
                        setParams((current) => ({
                          ...current,
                          [param.name]: event.target.value,
                        }))
                      }
                      placeholder={param.placeholder}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]/40"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <Braces className="h-3.5 w-3.5" />
                Request Body
              </div>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                spellCheck={false}
                className="min-h-[220px] w-full rounded-2xl border border-white/10 bg-[#050816] px-4 py-4 font-mono text-xs leading-6 text-slate-100 outline-none transition focus:border-[var(--accent)]/40"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="border-white/8 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Response
                </div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">
                  {response.status !== null
                    ? `HTTP ${response.status} • ${response.contentType}`
                    : "No response yet"}
                </div>
              </div>
            </div>

            <pre className="mt-4 max-h-[55vh] overflow-auto rounded-2xl border border-white/10 bg-[#040713] p-4 font-mono text-xs leading-6 text-slate-100">
              {response.body}
            </pre>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
