import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Helper to find all Next.js page routes in src/app
function getAppRoutes(dir: string, base = ''): string[] {
  const routes: string[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip special Next.js dirs (api, components, etc handled if needed)
      if (file.startsWith('(') || file.startsWith('@')) {
          routes.push(...getAppRoutes(fullPath, base));
      } else if (!file.startsWith('_') && file !== 'api') {
          routes.push(...getAppRoutes(fullPath, base + '/' + file));
      }
    } else if (file === 'page.tsx' || file === 'page.js') {
      routes.push(base || '/');
    }
  }
  return routes;
}

describe('Dashboard Route Integrity', () => {
  const appDir = path.join(process.cwd(), 'src/app');
  const availableRoutes = new Set(getAppRoutes(appDir));

  it('should have a root page', () => {
    expect(availableRoutes.has('/')).toBe(true);
  });

  it('should have all critical operational routes', () => {
    const critical = [
      '/audit',
      '/setup',
      '/login'
    ];
    
    for (const route of critical) {
      expect(availableRoutes.has(route), `Missing critical route: ${route}`).toBe(true);
    }
  });

  // This is a static analysis check for hardcoded internal links
  it('should not have broken internal links in major components', () => {
    const componentsDir = path.join(process.cwd(), 'src/components');
    if (!fs.existsSync(componentsDir)) return;

    const files = fs.readdirSync(componentsDir, { recursive: true }) as string[];
    const tsxFiles = files.filter(f => f.endsWith('.tsx'));

    for (const file of tsxFiles) {
      const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
      const linkMatches = content.matchAll(/href=["\'](\/[^"\']+)["\']/g);
      
      for (const match of linkMatches) {
        const link = match[1];
        // Skip external, dynamic (with [ or $), or non-page links
        if (link.startsWith('http') || link.includes('[') || link.includes('$') || link.includes('#') || link.startsWith('/api')) {
          continue;
        }
        
        // Basic check: is the base route registered?
        const baseRoute = link.split('?')[0];
        expect(availableRoutes.has(baseRoute), `Broken link found in ${file}: ${link}`).toBe(true);
      }
    }
  });
});
