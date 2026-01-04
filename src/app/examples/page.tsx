"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";

export default function ExamplesPage() {
  const examples = [
    {
      title: "Secure AI Agent Chat",
      description:
        "End-to-end audited LLM interaction using Talos Protocol capabilities.",
      link: "/examples/chat",
      status: "ready",
    },
    {
      title: "MCP Status Dashboard",
      description:
        "Real-time monitoring of all configured MCP downstream services.",
      link: "/examples/mcp-status",
      status: "ready",
    },
    {
      title: "Policy Explorer",
      description:
        "Visual interface for investigating capability chains and delegation paths.",
      link: "#",
      status: "coming-soon",
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg)] p-8 font-sans text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto space-y-8">
        <PageHeader
          title="Examples Catalog"
          subtitle="Interactive demonstrations of the Talos Protocol"
          actions={
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Back to Console
            </Link>
          }
        />

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {examples.map((ex) => (
            <GlassPanel
              key={ex.title}
              className="p-6 flex flex-col justify-between h-48"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{ex.title}</h3>
                  {ex.status === "coming-soon" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--text-muted)]/10 text-[var(--text-muted)] rounded">
                      SOON
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-muted)] text-sm">
                  {ex.description}
                </p>
              </div>

              {ex.status === "ready" ? (
                <Link
                  href={ex.link}
                  className="inline-flex items-center text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  Launch Demo →
                </Link>
              ) : (
                <span className="text-sm font-semibold opacity-30 cursor-not-allowed">
                  Launch Demo →
                </span>
              )}
            </GlassPanel>
          ))}
        </div>
      </div>
    </main>
  );
}
