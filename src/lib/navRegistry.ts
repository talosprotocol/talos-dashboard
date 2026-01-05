/**
 * Talos Dashboard - Navigation Registry
 * Single source of truth for all routes, labels, and hierarchy.
 */

export type NavGroup = "core" | "demos";
export type NavItem = {
    label: string;
    icon: string;
    ariaLabel: string;
    group: NavGroup;
    parent: string | null;
};

/**
 * Route registry - all navigation items derive from this.
 * Icons are emoji placeholders; replace with lucide icons for production.
 * 
 * Note: Examples are in the talos-examples repo, not part of the dashboard.
 */
export const NAV_REGISTRY: Record<string, NavItem> = {
    "/console": {
        label: "Console",
        icon: "📊",
        ariaLabel: "Security Console",
        group: "core",
        parent: null,
    },
    "/status": {
        label: "Status",
        icon: "🔌",
        ariaLabel: "MCP Status Dashboard",
        group: "core",
        parent: null,
    },
};

/**
 * Get navigation items for the sidebar.
 * Only returns top-level items (parent === null).
 */
export function getNavItems(): { href: string; item: NavItem }[] {
    return Object.entries(NAV_REGISTRY)
        .filter(([, item]) => item.parent === null)
        .map(([href, item]) => ({ href, item }));
}

/**
 * Derive breadcrumb trail from pathname.
 * Uses longest-prefix matching for unknown paths.
 * Never throws - always returns at least a fallback.
 */
export function getBreadcrumbs(pathname: string): { href: string; label: string }[] {
    const crumbs: { href: string; label: string }[] = [];

    // Check for exact match first
    if (NAV_REGISTRY[pathname]) {
        // Build chain from parent pointers
        let current: string | null = pathname;
        const chain: string[] = [];

        while (current) {
            chain.unshift(current);
            current = NAV_REGISTRY[current]?.parent ?? null;
        }

        for (const route of chain) {
            crumbs.push({
                href: route,
                label: NAV_REGISTRY[route].label,
            });
        }

        return crumbs;
    }

    // Longest prefix match for unknown paths
    const sortedRoutes = Object.keys(NAV_REGISTRY).sort((a, b) => b.length - a.length);
    for (const route of sortedRoutes) {
        if (pathname.startsWith(route)) {
            // Found a prefix match
            const result = getBreadcrumbs(route);
            // Add the unknown segment
            const remainder = pathname.slice(route.length).split("/").filter(Boolean);
            if (remainder.length > 0) {
                result.push({
                    href: pathname,
                    label: remainder.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" › "),
                });
            }
            return result;
        }
    }

    // Ultimate fallback - return Console
    return [{ href: "/console", label: "Console" }];
}

/**
 * Check if a pathname matches a nav route (exact or prefix for nested).
 */
export function isActiveRoute(pathname: string, route: string): boolean {
    if (route === "/console") {
        return pathname === "/console";
    }
    return pathname === route || pathname.startsWith(route + "/");
}
