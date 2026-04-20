"use client";

import { ReactNode } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { X } from "lucide-react";

export interface AdminModalProps {
    title: string;
    description?: string;
    /** @deprecated Use conditional rendering instead. Pass isOpen={true} or render conditionally. */
    isOpen?: boolean;
    onClose: () => void;
    onConfirm?: () => void | Promise<void>;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    children: ReactNode;
    danger?: boolean;
}

export function AdminModal({
    title,
    description,
    isOpen = true,
    onClose,
    onConfirm,
    confirmLabel = "Confirm",
    confirmDisabled = false,
    children,
    danger = false,
}: AdminModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <GlassPanel className="w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
                {/* Close button */}
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-slate-500 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="mb-5">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    {description && (
                        <p className="text-sm text-slate-500 mt-1">{description}</p>
                    )}
                </div>

                {/* Body */}
                <div className="mb-6">{children}</div>

                {/* Footer Actions */}
                {onConfirm && (
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={confirmDisabled}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                danger
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                                    : "bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 shadow-[0_0_15px_rgba(20,255,236,0.2)]"
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                )}
            </GlassPanel>
        </div>
    );
}
