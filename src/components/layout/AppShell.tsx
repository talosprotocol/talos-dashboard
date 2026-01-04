"use client";

import { TalosLogo } from "@/components/ui/TalosLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getNavItems, getBreadcrumbs, isActiveRoute } from "@/lib/navRegistry";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback, ReactNode, KeyboardEvent } from "react";

// =============================================================================
// Types
// =============================================================================

type AggregateStatus = "healthy" | "degraded" | "unknown" | "loading";

interface StatusResponse {
    aggregateStatus: "healthy" | "degraded" | "unknown";
    timestamp: number;
}

interface AppShellProps {
    children: ReactNode;
}

// =============================================================================
// Configuration
// =============================================================================

const POLL_INTERVAL = parseInt(process.env.NEXT_PUBLIC_STATUS_POLL_INTERVAL ?? "10000", 10);
const STALE_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_STATUS_STALE_THRESHOLD ?? "30000", 10);
const DASHBOARD_VERSION = process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? "0.1.x";

// =============================================================================
// AppShell Component
// =============================================================================

export function AppShell({ children }: Readonly<AppShellProps>) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [globalStatus, setGlobalStatus] = useState<AggregateStatus>("loading");
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [isStale, setIsStale] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const navItems = getNavItems();
    const breadcrumbs = getBreadcrumbs(pathname);

    // =========================================================================
    // Status Polling
    // =========================================================================

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/status/aggregate");
            if (res.ok) {
                const data: StatusResponse = await res.json();
                setGlobalStatus(data.aggregateStatus);
                setLastUpdated(data.timestamp);
                setIsStale(false);
            } else {
                setGlobalStatus("unknown");
            }
        } catch {
            setGlobalStatus("unknown");
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, POLL_INTERVAL);

        // Stale detection
        const staleInterval = setInterval(() => {
            if (lastUpdated && Date.now() - lastUpdated > STALE_THRESHOLD) {
                setIsStale(true);
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearInterval(staleInterval);
        };
    }, [fetchStatus, lastUpdated]);

    // =========================================================================
    // Mobile Menu Accessibility
    // =========================================================================

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape" && mobileMenuOpen) {
                setMobileMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [mobileMenuOpen]);

    // Focus trap
    useEffect(() => {
        if (mobileMenuOpen && mobileMenuRef.current) {
            const focusableElements = mobileMenuRef.current.querySelectorAll(
                'a[href], button, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            const trapFocus = (e: globalThis.KeyboardEvent) => {
                if (e.key !== "Tab") return;

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            };

            document.addEventListener("keydown", trapFocus);
            firstElement?.focus();

            return () => document.removeEventListener("keydown", trapFocus);
        }
    }, [mobileMenuOpen]);

    // Close on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // =========================================================================
    // Render
    // =========================================================================

    return (
        <div className="min-h-screen bg-[var(--bg)] flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-60 border-r border-[var(--glass-border)] bg-[var(--panel)] backdrop-blur-sm">
                {/* Brand */}
                <div className="p-5 border-b border-[var(--glass-border)]">
                    <Link href="/console" className="flex items-center gap-3 group">
                        <div className="p-2 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20 group-hover:bg-[var(--accent)]/20 transition-all">
                            <TalosLogo className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-sm">Talos Protocol</h1>
                            <p className="text-[10px] text-[var(--text-muted)]">Security Dashboard</p>
                        </div>
                    </Link>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 p-3 space-y-1" role="navigation" aria-label="Main navigation">
                    {navItems.map(({ href, item }) => {
                        const active = isActiveRoute(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                aria-label={item.ariaLabel}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                                        ? "bg-[var(--accent)]/10 text-[var(--accent)] border-l-2 border-[var(--accent)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                <span className="text-base" aria-hidden="true">{item.icon}</span>
                                <span>{item.label}</span>
                                {href === "/status" && (
                                    <HealthDot status={globalStatus} isStale={isStale} />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-[var(--glass-border)] space-y-3">
                    <a
                        href="https://github.com/talosprotocol/talos/tree/main/docs/wiki"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <span aria-hidden="true">📚</span>
                        <span>Documentation</span>
                    </a>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span>v{DASHBOARD_VERSION}</span>
                        <ThemeToggle />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-10 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--glass-border)] px-6 py-3">
                    <div className="flex items-center justify-between">
                        {/* Mobile Menu Button */}
                        <button
                            ref={menuButtonRef}
                            className="lg:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="mobile-nav"
                            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                            {breadcrumbs.map((crumb, i) => (
                                <span key={crumb.href} className="flex items-center gap-2">
                                    {i > 0 && <span className="text-[var(--text-muted)]" aria-hidden="true">›</span>}
                                    {i === breadcrumbs.length - 1 ? (
                                        <span className="font-medium text-[var(--text-primary)]" aria-current="page">{crumb.label}</span>
                                    ) : (
                                        <Link href={crumb.href} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                            {crumb.label}
                                        </Link>
                                    )}
                                </span>
                            ))}
                        </nav>

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            <HealthIndicator status={globalStatus} isStale={isStale} lastUpdated={lastUpdated} />
                            <div className="lg:hidden">
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-hidden="true"
                        />
                        <aside
                            ref={mobileMenuRef}
                            id="mobile-nav"
                            className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--panel)] border-r border-[var(--glass-border)] p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <TalosLogo className="w-6 h-6" />
                                    <span className="font-bold">Talos</span>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-1"
                                    aria-label="Close navigation menu"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <nav className="space-y-1" role="navigation" aria-label="Mobile navigation">
                                {navItems.map(({ href, item }) => {
                                    const active = isActiveRoute(pathname, href);
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            aria-current={active ? "page" : undefined}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${active
                                                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                                    : "text-[var(--text-secondary)]"
                                                }`}
                                        >
                                            <span aria-hidden="true">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </aside>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

// =============================================================================
// Sub-Components
// =============================================================================

function HealthDot({ status, isStale }: Readonly<{ status: AggregateStatus; isStale: boolean }>) {
    if (isStale) {
        return <span className="w-2 h-2 rounded-full bg-amber-500" aria-label="Status data is stale" />;
    }
    const colors: Record<AggregateStatus, string> = {
        healthy: "bg-emerald-500",
        degraded: "bg-red-500",
        unknown: "bg-gray-500",
        loading: "bg-amber-500 animate-pulse",
    };
    return <span className={`w-2 h-2 rounded-full ${colors[status]}`} aria-hidden="true" />;
}

function HealthIndicator({ status, isStale, lastUpdated }: Readonly<{ status: AggregateStatus; isStale: boolean; lastUpdated: number | null }>) {
    const config: Record<AggregateStatus, { color: string; bg: string; label: string }> = {
        healthy: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "All Systems Operational" },
        degraded: { color: "text-red-500", bg: "bg-red-500/10", label: "Issues Detected" },
        unknown: { color: "text-gray-500", bg: "bg-gray-500/10", label: "Status Unknown" },
        loading: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Checking..." },
    };

    const display = isStale ? { color: "text-amber-500", bg: "bg-amber-500/10", label: "Status Stale" } : config[status];
    const dotColor = isStale ? "bg-amber-500" : status === "healthy" ? "bg-emerald-500" : status === "degraded" ? "bg-red-500" : status === "loading" ? "bg-amber-500 animate-pulse" : "bg-gray-500";

    return (
        <div
            className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold ${display.bg} ${display.color}`}
            role="status"
            aria-live="polite"
        >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
            {display.label}
        </div>
    );
}
