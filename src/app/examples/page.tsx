"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { TalosLogo } from "@/components/ui/TalosLogo";
import Link from "next/link";

export default function ExamplesPage() {
  const examples = [
    {
      title: "Secure AI Chat",
      description:
        "End-to-end audited LLM interaction using Talos Protocol capabilities.",
      link: "/examples/chat",
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
        {/* Header */}
        <header className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors"
          >
            <TalosLogo className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Examples Catalog
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              Interactive demonstrations of the Talos Protocol
            </p>
          </div>
        </header>

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

        <div className="pt-8 border-t border-[var(--panel-border)]">
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Back to Security Console
          </Link>
        </div>
      </div>
    </main>
  );
}
