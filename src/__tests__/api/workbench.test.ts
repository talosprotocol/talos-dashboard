import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NAV_REGISTRY } from "../../lib/navRegistry";
import { API_WORKBENCH_ROUTES } from "../../lib/api/workbench";

function walk(dir: string, predicate: (fullPath: string) => boolean): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

function normalizeApiRoute(filePath: string): string {
  const rel = path.relative(path.join(process.cwd(), "src/app/api"), filePath);
  const noSuffix = rel.replace(/\/route\.ts$/, "").replace(/\\/g, "/");

  const route = noSuffix
    .split("/")
    .map((segment) => {
      if (segment === "[[...slug]]" || segment === "[...path]") return "*";
      if (/^\[.+\]$/.test(segment)) return `:${segment.slice(1, -1)}`;
      return segment;
    })
    .join("/");

  return `/api/${route}`;
}

function normalizeShellRoute(filePath: string): string {
  const rel = path.relative(path.join(process.cwd(), "src/app/(shell)"), filePath);
  const noSuffix = rel.replace(/\/page\.tsx$/, "").replace(/\\/g, "/");

  const route = noSuffix
    .split("/")
    .filter(Boolean)
    .filter((segment) => !/^\[.+\]$/.test(segment))
    .join("/");

  return `/${route}`;
}

function isCoveredByDashboardRoute(route: string, discovered: Set<string>): boolean {
  if (discovered.has(route)) return true;

  return [...discovered].some((candidate) => {
    if (!candidate.endsWith("/*")) return false;
    return route.startsWith(candidate.slice(0, -1));
  });
}

describe("API workbench coverage", () => {
  it("registers every dashboard-owned API route for same-origin execution", () => {
    const routeFiles = walk(path.join(process.cwd(), "src/app/api"), (fullPath) =>
      fullPath.endsWith("/route.ts"),
    );
    const discovered = new Set(routeFiles.map(normalizeApiRoute));
    const registered = new Set(API_WORKBENCH_ROUTES.map((route) => route.path));

    const missing = [...discovered].filter((route) => !registered.has(route));
    const uncovered = [...registered].filter((route) => !isCoveredByDashboardRoute(route, discovered));

    expect(missing).toEqual([]);
    expect(uncovered).toEqual([]);
  });

  it("keeps every static shell page reachable from navigation", () => {
    const pageFiles = walk(path.join(process.cwd(), "src/app/(shell)"), (fullPath) =>
      fullPath.endsWith("/page.tsx"),
    );
    const staticRoutes = new Set(pageFiles.map(normalizeShellRoute));
    const navRoutes = new Set(Object.keys(NAV_REGISTRY));

    expect(navRoutes).toEqual(staticRoutes);
  });
});
