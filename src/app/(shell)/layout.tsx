import { AppShell } from "@/components/layout/AppShell";

/**
 * Shell Layout - Wraps all main app pages with AppShell
 * 
 * This route group provides:
 * - Unified navigation sidebar
 * - Breadcrumbs
 * - Global status indicator
 * - Theme toggle
 * 
 * Pages outside (shell) will NOT have the sidebar (e.g., future auth pages)
 */
export default function ShellLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppShell>{children}</AppShell>;
}
