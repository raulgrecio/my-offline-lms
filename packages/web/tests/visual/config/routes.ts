import { NodeFileSystem, NodePath } from "@core/filesystem";
import { logger } from "../logger";

const PAGES_DIR = "src/pages";
const fs = new NodeFileSystem();
const path = new NodePath();

export async function discoverRoutes(filters: string[] = []): Promise<string[]> {
  const allRoutes: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir);

    for (const name of entries) {
      const fullPath = path.join(dir, name);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!name.match(/\.(astro|tsx|jsx|md)$/)) {
        continue;
      }

      if (name.startsWith("_")) {
        continue;
      }

      // Ignore API routes
      if (fullPath.includes("/api/")) {
        continue;
      }

      let route = fullPath
        .replace(PAGES_DIR, "")
        .replace(/index\.(astro|tsx|jsx|md)$/, "")
        .replace(/\.(astro|tsx|jsx|md)$/, "");

      if (route === "") route = "/";

      // Ignore dynamic routes
      if (route.includes("[") || route.includes("]")) {
        continue;
      }

      allRoutes.push(route);
    }
  }

  await walk(PAGES_DIR);

  // Add specific test routes requested by the user
  const extraRoutes = [
    '/learning-paths/80836',
    '/courses/105208'
  ];

  for (const r of extraRoutes) {
    if (!allRoutes.includes(r)) {
      allRoutes.push(r);
    }
  }

  // Apply filters if provided
  if (filters.length > 0) {
    const filtered = allRoutes.filter(route => {
      return filters.some(filter => {
        // Match by exact route
        if (route === filter) return true;
        // Match if filter is part of the route
        if (route.includes(filter)) return true;
        // Match by normalized file name (e.g. "button-showcase.astro" -> "/debug/components/button-showcase")
        const normalizedFilter = filter
          .replace("packages/web/", "")
          .replace(PAGES_DIR, "")
          .replace(/\.(astro|tsx|jsx|md)$/, "")
          .replace(/index$/, "");
        
        return normalizedFilter !== "" && route.includes(normalizedFilter);
      });
    });
    
    return filtered.sort();
  }

  return allRoutes.sort();
}
