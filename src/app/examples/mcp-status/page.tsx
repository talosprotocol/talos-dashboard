"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { useState, useEffect } from "react";
import Link from "next/link";

interface ServiceStatus {
  name: string;
  description: string;
  port: number;
  endpoint: string;
  status: "online" | "offline" | "checking";
  latency?: number;
  lastChecked?: Date;
}

const CONFIGURED_SERVICES: ServiceStatus[] = [
  {
    name: "Talos Gateway",
    description: "Main API gateway for audit events and routing",
    port: 8080,
    endpoint: "/api/gateway/status",
    status: "checking",
  },
  {
    name: "Audit Service",
    description: "Event storage and integrity verification",
    port: 8081,
    endpoint: "/health",
    status: "checking",
  },
  {
    name: "MCP Connector",
    description: "Bridge to MCP protocol and LLM backends",
    port: 8082,
    endpoint: "/health",
    status: "checking",
  },
  {
    name: "Ollama (LLM)",
    description: "Local AI model inference server",
    port: 11434,
    endpoint: "/api/tags",
    status: "checking",
  },
];

export default function MCPStatusPage() {
  const [services, setServices] =
    useState<ServiceStatus[]>(CONFIGURED_SERVICES);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const checkService = async (
    service: ServiceStatus,
  ): Promise<ServiceStatus> => {
    const start = Date.now();
    try {
      const res = await fetch(
        `http://localhost:${service.port}${service.endpoint}`,
        {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        },
      );
      const latency = Date.now() - start;
      return {
        ...service,
        status: res.ok ? "online" : "offline",
        latency,
        lastChecked: new Date(),
      };
    } catch {
      return {
        ...service,
        status: "offline",
        latency: undefined,
        lastChecked: new Date(),
      };
    }
  };

  const refreshAll = async () => {
    setServices((prev) =>
      prev.map((s) => ({ ...s, status: "checking" as const })),
    );
    const results = await Promise.all(CONFIGURED_SERVICES.map(checkService));
    setServices(results);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    // Initial load
    (async () => {
      setServices((prev) =>
        prev.map((s) => ({ ...s, status: "checking" as const })),
      );
      const results = await Promise.all(CONFIGURED_SERVICES.map(checkService));
      setServices(results);
      setLastRefresh(new Date());
    })();

    // Periodic refresh
    const interval = setInterval(async () => {
      setServices((prev) =>
        prev.map((s) => ({ ...s, status: "checking" as const })),
      );
      const results = await Promise.all(CONFIGURED_SERVICES.map(checkService));
      setServices(results);
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = services.filter((s) => s.status === "online").length;
  const totalCount = services.length;

  return (
    <main className="min-h-screen bg-[var(--bg)] p-8 font-sans text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="MCP Status Dashboard"
          subtitle={`${onlineCount}/${totalCount} services online`}
          actions={
            <div className="flex items-center gap-4">
              <button
                onClick={refreshAll}
                className="px-3 py-1.5 text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-all"
              >
                Refresh
              </button>
              <Link
                href="/examples"
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Back to Catalog
              </Link>
            </div>
          }
        />

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <GlassPanel key={service.name} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    {service.description}
                  </p>
                </div>
                <StatusBadge status={service.status} />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="font-mono">localhost:{service.port}</span>
                {service.latency !== undefined && (
                  <span className="text-[var(--success)]">
                    {service.latency}ms
                  </span>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[var(--text-muted)]">
          {lastRefresh && (
            <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: Readonly<{ status: "online" | "offline" | "checking" }>) {
  if (status === "online") {
    return (
      <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-500/20">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        {"ONLINE"}
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        {"OFFLINE"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full border border-amber-500/20">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
      {"CHECKING..."}
    </span>
  );
}
