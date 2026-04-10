import { NodeFileSystem, NodePath } from "@core/filesystem";

const PAGES_DIR = "src/pages";
const fs = new NodeFileSystem();
const path = new NodePath();

export async function discoverRoutes(): Promise<string[]> {
  const routes: string[] = [];

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

      routes.push(route);
    }
  }

  await walk(PAGES_DIR);

  // Add specific test routes requested by the user
  const extraRoutes = [
    '/learning-paths/80836',
    '/courses/105208'
  ];

  for (const r of extraRoutes) {
    if (!routes.includes(r)) {
      routes.push(r);
    }
  }

  return routes.sort();
}
