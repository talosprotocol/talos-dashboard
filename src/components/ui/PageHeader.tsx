"use client";

import { TalosLogo } from "./TalosLogo";
import { ThemeToggle } from "../ThemeToggle";
import { cn } from "@/lib/cn";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  center?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  center,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <header className={cn("flex flex-col gap-4 mb-8", className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20 shadow-sm">
            <TalosLogo className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-[var(--text-muted)] text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center / Breadcrumb Slot */}
        {center && (
          <div className="hidden lg:flex flex-1 justify-center">{center}</div>
        )}

        {/* Actions & Theme */}
        <div className="flex items-center gap-4">
          {actions}
          <div className="h-4 w-px bg-[var(--panel-border)] mx-1 hidden sm:block" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
