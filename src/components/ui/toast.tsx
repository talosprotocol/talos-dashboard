"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon, X, CheckCircle2, AlertCircle, Info, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "success" | "destructive" | "warning"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: ToastVariant
}

const variantStyles: Record<ToastVariant, { icon: LucideIcon, color: string, border: string, bg: string }> = {
  default: { icon: Info, color: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/5" },
  success: { icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  destructive: { icon: AlertCircle, color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" },
  warning: { icon: Flame, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps & { onClose: () => void }>(
  ({ title, description, action, variant = "default", onClose }, ref) => {
    const { icon: Icon, color, border, bg } = variantStyles[variant]

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        className={cn(
          "pointer-events-auto relative flex w-full max-w-md items-start gap-4 overflow-hidden rounded-2xl border p-5 shadow-2xl backdrop-blur-xl transition-all",
          bg,
          border
        )}
      >
        {/* Progress Bar background effect */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/[0.02]" />
        
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] border border-white/5", color)}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 space-y-1">
          {title && <h3 className="text-sm font-black uppercase tracking-widest text-white leading-tight">{title}</h3>}
          {description && <p className="text-xs font-bold text-slate-500 tracking-tight leading-normal">{description}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>

        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-slate-600 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    )
  }
)
Toast.displayName = "Toast"
