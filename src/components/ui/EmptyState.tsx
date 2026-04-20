"use client"

import { LucideIcon, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Ghost,
  action,
  className
}: Readonly<EmptyStateProps>) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]",
      className
    )}>
      <div className="p-4 rounded-full bg-white/5 mb-4 text-slate-500">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
}
