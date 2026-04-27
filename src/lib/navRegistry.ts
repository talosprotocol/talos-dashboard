/**
 * Talos Dashboard - Navigation Registry
 * Single source of truth for all routes, labels, and hierarchy.
 */

export type NavGroup = "core" | "admin" | "demos";
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
 * Note: Examples require backends to be running separately.
 */
export const NAV_REGISTRY: Record<string, NavItem> = {
    "/api-workbench": {
        label: "API Workbench",
        icon: "🛠️",
        ariaLabel: "Dashboard API Workbench",
        group: "core",
        parent: null,
    },
    "/agent": {
        label: "Agent",
        icon: "🤖",
        ariaLabel: "Secure Agent Console",
        group: "core",
        parent: null,
    },
    "/configuration": {
        label: "Configuration",
        icon: "⚙️",
        ariaLabel: "Configuration Workspace",
        group: "core",
        parent: null,
    },
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
    "/management": {
        label: "Management",
        icon: "⚙️",
        ariaLabel: "System Management Hub",
        group: "core",
        parent: null,
    },
    "/llm/upstreams": {
        label: "Upstreams",
        icon: "☁️",
        ariaLabel: "LLM Upstreams",
        group: "core",
        parent: null,
    },
    "/llm/models": {
        label: "Model Groups",
        icon: "🧠",
        ariaLabel: "Model Groups",
        group: "core",
        parent: null,
    },
    "/llm/playground": {
        label: "AI Playground",
        icon: "🎮",
        ariaLabel: "LLM Test Playground",
        group: "core",
        parent: null,
    },
    "/mcp/servers": {
        label: "MCP Servers",
        icon: "🛠️",
        ariaLabel: "MCP Servers",
        group: "core",
        parent: null,
    },
    "/mcp/policies": {
        label: "MCP Policies",
        icon: "🛡️",
        ariaLabel: "MCP Policies",
        group: "core",
        parent: null,
    },
    "/audit": {
        label: "Audit Logs",
        icon: "📜",
        ariaLabel: "Security Audit Trail",
        group: "core",
        parent: null,
    },
    "/telemetry": {
        label: "Telemetry",
        icon: "📈",
        ariaLabel: "System Telemetry",
        group: "core",
        parent: null,
    },
    "/setup": {
        label: "Setup Helper",
        icon: "🚀",
        ariaLabel: "Agent Setup Helper",
        group: "core",
        parent: null,
    },
    "/admin/secrets": {
        label: "Secrets",
        icon: "🔐",
        ariaLabel: "Secrets Management",
        group: "admin",
        parent: null,
    },
    "/admin/rbac": {
        label: "RBAC",
        icon: "🛡️",
        ariaLabel: "Role-Based Access Control",
        group: "admin",
        parent: null,
    },
    "/admin/aiops": {
        label: "AIOps Monitor",
        icon: "🤖",
        ariaLabel: "Agent Tool-Call Monitor",
        group: "admin",
        parent: null,
    },
    "/admin/budgets": {
        label: "Budgets & Keys",
        icon: "💰",
        ariaLabel: "Budget and Virtual Key Management",
        group: "admin",
        parent: null,
    },
    "/settings": {
        label: "Settings",
        icon: "⚙️",
        ariaLabel: "Dashboard Settings",
        group: "core",
        parent: null,
    },
    "/examples": {
        label: "Examples",
        icon: "🧪",
        ariaLabel: "Interactive Demos",
        group: "demos",
        parent: null,
    },
    "/examples/chat": {
        label: "Secure Chat",
        icon: "💬",
        ariaLabel: "Secure AI Agent Chat",
        group: "demos",
        parent: "/examples",
    },
    "/examples/devops": {
        label: "DevOps Agent",
        icon: "🛠️",
        ariaLabel: "DevOps Agent Demo",
        group: "demos",
        parent: "/examples",
    },
    "/gateway": {
        label: "Gateway",
        icon: "🔌",
        ariaLabel: "Gateway Status Detail",
        group: "core",
        parent: null,
    },
    "/sessions": {
        label: "Sessions",
        icon: "📜",
        ariaLabel: "Session Activity Explorer",
        group: "core",
        parent: null,
    },
};



/**
 * Get navigation items for the sidebar.
 * Returns core items, then admin items, both top-level only.
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
