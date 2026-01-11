"use client";

import { ReactNode } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { X } from "lucide-react";

interface AdminModalProps {
    title: string;
    description?: string;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

export function AdminModal({ title, description, isOpen, onClose, children }: AdminModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassPanel className="w-full max-w-lg p-6 shadow-2xl scale-in-center relative overflow-hidden">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-[var(--panel-hover)] text-[var(--text-muted)] transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                    {description && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
                    )}
                </div>

                {children}
            </GlassPanel>
        </div>
    );
}
