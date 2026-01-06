import { GlassPanel } from "@/components/ui/GlassPanel";
import { Search, X } from "lucide-react";
import { AuditFilters } from "@/lib/data/DataSource";

interface AuditFiltersPanelProps {
    filters: AuditFilters;
    onChange: (filters: AuditFilters) => void;
    onClose: () => void;
}

export function AuditFiltersPanel({ filters, onChange, onClose }: AuditFiltersPanelProps) {
    const handleChange = (key: keyof AuditFilters, value: any) => {
        const newFilters = { ...filters, [key]: value };
        if (!value) delete newFilters[key]; // Clear empty keys
        onChange(newFilters);
    };

    return (
        <GlassPanel className="absolute top-16 right-6 w-80 p-4 z-20 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Filters</h3>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Session ID */}
            <div className="space-y-1">
                <label className="text-xs text-[var(--text-muted)] font-medium">Session ID</label>
                <div className="relative">
                    <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search session..."
                        className="w-full bg-[var(--bg)] border border-[var(--glass-border)] rounded px-2 py-1.5 pl-7 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        value={filters.session_id || ""}
                        onChange={(e) => handleChange("session_id", e.target.value)}
                    />
                </div>
            </div>

            {/* Correlation ID */}
            <div className="space-y-1">
                <label className="text-xs text-[var(--text-muted)] font-medium">Correlation ID</label>
                <input
                    type="text"
                    placeholder="Search correlation..."
                    className="w-full bg-[var(--bg)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    value={filters.correlation_id || ""}
                    onChange={(e) => handleChange("correlation_id", e.target.value)}
                />
            </div>

            {/* Outcome */}
            <div className="space-y-1">
                <label className="text-xs text-[var(--text-muted)] font-medium">Outcome</label>
                <select
                    className="w-full bg-[var(--bg)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    value={filters.outcome || ""}
                    onChange={(e) => handleChange("outcome", e.target.value as any)}
                >
                    <option value="">All Outcomes</option>
                    <option value="OK">Allowed (OK)</option>
                    <option value="DENY">Denied (DENY)</option>
                    <option value="ERROR">Errors (ERROR)</option>
                </select>
            </div>

            {/* Denial Reason (Conditional) */}
            {filters.outcome === "DENY" && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs text-[var(--text-muted)] font-medium">Denial Reason</label>
                    <select
                        className="w-full bg-[var(--bg)] border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        value={filters.denial_reason || ""}
                        onChange={(e) => handleChange("denial_reason", e.target.value)}
                    >
                        <option value="">All Reasons</option>
                        <option value="POLICY_VIOLATION">Policy Violation</option>
                        <option value="RATE_LIMIT">Rate Limit</option>
                        <option value="INVALID_TOKEN">Invalid Token</option>
                    </select>
                </div>
            )}
        </GlassPanel>
    );
}
