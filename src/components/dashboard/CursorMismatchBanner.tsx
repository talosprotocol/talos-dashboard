"use client";

import React from "react";
import { ShieldAlert, X } from "lucide-react";

interface CursorValidationError {
    eventId: string;
    cursor: string;
    derived: string;
    reason: "CURSOR_MISMATCH" | "INVALID_FRAME";
}

interface CursorMismatchBannerProps {
    readonly errors: CursorValidationError[];
    readonly onDismiss?: () => void;
}

export function CursorMismatchBanner({
    errors,
    onDismiss
}: CursorMismatchBannerProps) {
    if (errors.length === 0) return null;

    const mismatchCount = errors.filter(e => e.reason === "CURSOR_MISMATCH").length;
    const invalidFrameCount = errors.filter(e => e.reason === "INVALID_FRAME").length;

    return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-red-200">
                            Cursor Validation Failed
                        </h3>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="text-red-500/70 hover:text-red-300 text-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-red-200/70 mt-1">
                        {errors.length} event{errors.length > 1 ? "s" : ""} failed cursor validation.
                        {mismatchCount > 0 && ` ${mismatchCount} cursor mismatch${mismatchCount > 1 ? "es" : ""}.`}
                        {invalidFrameCount > 0 && ` ${invalidFrameCount} invalid frame${invalidFrameCount > 1 ? "s" : ""}.`}
                    </p>
                    <p className="text-xs text-red-200/50 mt-2">
                        This may indicate data tampering or corruption. Consider contacting your administrator.
                    </p>

                    {/* Error Details */}
                    <details className="mt-3 text-xs text-red-200/50">
                        <summary className="cursor-pointer hover:text-red-200/70">
                            View validation errors ({errors.length})
                        </summary>
                        <ul className="mt-2 space-y-2 pl-4 border-l border-red-500/20">
                            {errors.slice(0, 5).map((err, i) => (
                                <li key={i} className="space-y-1">
                                    <div className="font-mono text-red-300/70">
                                        Event: {err.eventId.slice(0, 8)}...
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-red-400/60">
                                            Reason: <span className="font-medium">{err.reason}</span>
                                        </span>
                                        {err.reason === "CURSOR_MISMATCH" && (
                                            <>
                                                <span className="text-red-400/60">
                                                    Stored: {err.cursor.slice(0, 20)}...
                                                </span>
                                                <span className="text-red-400/60">
                                                    Expected: {err.derived.slice(0, 20)}...
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                            {errors.length > 5 && (
                                <li className="text-red-300/50">+{errors.length - 5} more...</li>
                            )}
                        </ul>
                    </details>
                </div>
            </div>
        </div>
    );
}

export type { CursorValidationError };
