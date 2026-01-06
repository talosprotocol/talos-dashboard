"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useRef, useState } from "react";
import { AuditEvent } from "@/lib/data/schemas";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";
import { CheckCircle2, FileJson, ShieldAlert } from "lucide-react";
import { ProofDrawer } from "./ProofDrawer";

interface AuditTableProps {
    readonly data: AuditEvent[];
    readonly onFetchMore: () => void;
    readonly isLoading: boolean;
    readonly selectedIds?: Set<string>;
    readonly onSelectionChange?: (ids: Set<string>) => void;
}

interface AuditTableMeta {
    selectedIds?: Set<string>;
    toggleSelection?: (id: string) => void;
    setSelectedEvent?: (event: AuditEvent | null) => void;
}

const SelectCell = ({ row, selectedIds, toggleSelection }: any) => {
    const id = row.original.event_id;
    const isSelected = selectedIds?.has(id);
    return (
        <div className="flex items-center justify-center">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(id)}
                onClick={(e) => e.stopPropagation()}
                className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900/50 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
            />
        </div>
    );
};

const IdentityCell = ({ row }: any) => {
    const { agent_id, peer_id } = row.original;
    return (
        <div className="flex flex-col text-xs font-mono">
            <span className="text-[var(--text-primary)]" title={agent_id}>A: {agent_id ? agent_id.slice(0, 8) : "?"}</span>
            <span className="text-[var(--text-muted)]" title={peer_id}>P: {peer_id ? peer_id.slice(0, 8) : "?"}</span>
        </div>
    );
};

const ProofCell = ({ row }: any) => {
    const integrity = row.original.integrity;
    const valid = integrity.proof_state === "VERIFIED";
    return (
         <div className="flex items-center gap-1.5">
            {valid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" />
            ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500/50" />
            )}
            <span className={cn("text-[10px]", valid ? "text-[var(--text-muted)]" : "text-amber-500")}>
                {integrity.proof_state}
            </span>
        </div>
    );
};

const TimestampCell = ({ getValue }: any) => (
    <span className="font-mono text-xs text-[var(--text-secondary)]">
        {new Date(getValue() * 1000).toISOString()}
    </span>
);

const TypeCell = ({ getValue }: any) => (
    <span className="px-1.5 py-0.5 rounded bg-[var(--glass-border)] text-[var(--text-secondary)] text-[10px] uppercase font-mono tracking-wider">
        {getValue()}
    </span>
);

const OutcomeCell = ({ getValue }: any) => {
    const val = getValue();
    const colors = {
        OK: "text-emerald-500",
        DENY: "text-amber-500",
        ERROR: "text-red-500"
    };
    // @ts-ignore - colors index safety
    return <span className={cn("font-bold text-xs", colors[val])}>{val}</span>;
};

const ReasonCell = ({ getValue }: any) => {
    const val = getValue();
    if (!val) return <span className="text-[var(--text-muted)]">-</span>;
    return <span className="text-amber-500/80 text-[10px] font-mono">{val}</span>;
};

const ActionCell = ({ row, setSelectedEvent }: Readonly<{ row: any; setSelectedEvent: (e: any) => void }>) => (
    <button
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(row.original); }}
        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title="View Proof & Evidence"
    >
        <FileJson className="w-4 h-4" />
    </button>
);

const columns: ColumnDef<AuditEvent>[] = [
    {
        id: "select",
        header: "",
        cell: ({ row, table }) => {
            const meta = table.options.meta as AuditTableMeta;
            return (
                <SelectCell 
                    row={row} 
                    selectedIds={meta?.selectedIds} 
                    toggleSelection={meta?.toggleSelection} 
                />
            );
        },
        size: 40,
    },
    {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: (info) => <TimestampCell getValue={info.getValue} />,
        size: 180,
    },
    {
        accessorKey: "event_type",
        header: "Type",
        cell: (info) => <TypeCell getValue={info.getValue} />,
        size: 140,
    },
    {
        accessorKey: "outcome",
        header: "Outcome",
        cell: (info) => <OutcomeCell getValue={info.getValue} />,
        size: 80,
    },
    {
        accessorKey: "denial_reason",
        header: "Reason",
        cell: (info) => <ReasonCell getValue={info.getValue} />,
        size: 150,
    },
    {
        id: "identity",
        header: "Identity",
        cell: IdentityCell,
        size: 150,
    },
    {
        id: "proof",
        header: "Proof",
        cell: ProofCell,
        size: 120,
    },
    {
        id: "actions",
        header: "",
        cell: ({ row, table }) => {
            const meta = table.options.meta as AuditTableMeta;
            return (
                <ActionCell 
                    row={row} 
                    setSelectedEvent={meta?.setSelectedEvent!} 
                />
            );
        },
        size: 50,
    }
];

export function AuditTable({ data, onFetchMore, isLoading, selectedIds, onSelectionChange }: AuditTableProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

    const toggleSelection = (id: string) => {
        if (!onSelectionChange || !selectedIds) return;
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    };



    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            selectedIds,
            toggleSelection,
            setSelectedEvent
        } as AuditTableMeta,
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48, // 48px row height
        overscan: 10,
    });

    return (
        <>
            <GlassPanel className="w-full flex flex-col h-[calc(100vh-200px)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center bg-[var(--panel)] border-b border-[var(--glass-border)] h-10 px-4">
                    {table.getHeaderGroups().map(headerGroup => (
                        <div key={headerGroup.id} className="flex flex-1 w-full">
                            {headerGroup.headers.map(header => (
                                <div
                                    key={header.id}
                                    style={{ width: header.getSize() }}
                                    className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider flex-shrink-0"
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </div>
                            ))}
                        </div>
                    ))}
                    {/* Scrollbar spacer */}
                    <div className="w-2" />
                </div>

                {/* Virtualized Body */}
                <div
                    ref={parentRef}
                    className="flex-1 overflow-auto"
                    onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        if (target.scrollHeight - target.scrollTop - target.clientHeight < 200) {
                            if (!isLoading) onFetchMore();
                        }
                    }}
                >
                    <table
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        <tbody>
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const row = rows[virtualRow.index];
                                return (
                                    <tr
                                        key={row.id}
                                        aria-selected={selectedIds?.has(row.original.event_id)}
                                        tabIndex={0}
                                        onClick={() => setSelectedEvent(row.original)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedEvent(row.original);
                                            }
                                        }}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        className={cn(
                                            "absolute top-0 left-0 w-full flex items-center px-4 h-12 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group",
                                            virtualRow.index % 2 === 1 && "bg-white/[0.02]"
                                        )}
                                        style={{
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                style={{ width: cell.column.getSize() }}
                                                className="flex-shrink-0 overflow-hidden p-0"
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {isLoading && (
                        <div className="p-4 text-center text-xs text-[var(--text-muted)]">Loading more events...</div>
                    )}
                </div>
            </GlassPanel>

            {/* Proof Drawer */}
            {selectedEvent && (
                <>
                    <button
                        type="button"
                        aria-label="Close drawer"
                        className="fixed inset-0 w-full h-full bg-black/50 backdrop-blur-sm z-40 transition-opacity cursor-default" 
                        onClick={() => setSelectedEvent(null)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setSelectedEvent(null);
                        }}
                    />
                    <ProofDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                </>
            )}
        </>
    );
}
