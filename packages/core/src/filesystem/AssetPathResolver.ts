import type { AssetPathsJson } from "../domain/models/AssetPathsJson";
import type { IFileSystem } from "./IFileSystem";

export class AssetPathResolver {
  private configPath: string;
  private monorepoRoot: string;
  private fs: IFileSystem;
  private config: AssetPathsJson | null = null;

  constructor({
    configPath,
    monorepoRoot,
    fs,
  }: {
    configPath: string;
    monorepoRoot: string;
    fs: IFileSystem;
  }) {
    this.configPath = configPath;
    this.monorepoRoot = monorepoRoot;
    this.fs = fs;
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (this.fs.existsSync(this.configPath)) {
        const content = this.fs.readFileSync(this.configPath, "utf-8");
        this.config = JSON.parse(content);
      } else {
        // Default fallback if config doesn't exist
        this.config = {
          defaultWritePath: "data/assets",
          searchPaths: [{ path: "data/assets", label: "Default" }],
        };
      }
    } catch (error) {
      console.error("Error loading asset paths config:", error);
      this.config = {
        defaultWritePath: "data/assets",
        searchPaths: [{ path: "data/assets", label: "Default" }],
      };
    }
  }

  /**
   * Resolves a path to an absolute path, handling both relative to monorepo and absolute paths.
   */
  private getAbsolutePath(p: string): string {
    if (this.fs.isAbsolute(p)) return p;
    return this.fs.resolve(this.monorepoRoot, p);
  }

  /**
   * Returns all available search paths, flagging if they are mounted/exist.
   */
  getAvailablePaths() {
    if (!this.config) return [];
    return this.config.searchPaths.map((sp) => {
      const fullPath = this.getAbsolutePath(sp.path);
      return {
        ...sp,
        fullPath,
        available: this.fs.existsSync(fullPath),
      };
    });
  }

  /**
   * Returns the default path for new downloads.
   */
  getDefaultWritePath(): string {
    return this.getAbsolutePath(this.config?.defaultWritePath || "data/assets");
  }

  /**
   * Tries to find an asset (courseId/type/filename) in all search paths.
   */
  findAsset(
    courseId: string,
    type: "videos" | "guides",
    filename: string
  ): string | null {
    const relativePath = this.fs.join(String(courseId), type, filename);
    const availablePaths = this.getAvailablePaths().filter((p) => p.available);

    for (const sp of availablePaths) {
      const fullPath = this.fs.join(sp.fullPath, relativePath);
      if (this.fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Checks if an asset exists anywhere in the search paths.
   */
  assetExistsAnywhere(
    courseId: string,
    type: "videos" | "guides",
    filename: string
  ): boolean {
    return this.findAsset(courseId, type, filename) !== null;
  }

  /**
   * Receives an absolute path (possibly old/broken) and tries to find the file
   * by extracting the courseId/type/filename pattern and searching other locations.
   */
  resolveExistingPath(absolutePath: string): string | null {
    if (this.fs.existsSync(absolutePath)) return absolutePath;

    // Pattern: .../{courseId}/{videos|guides}/{filename}
    // We match from the end
    const parts = absolutePath.split(this.fs.sep);
    if (parts.length < 3) return null;

    const filename = parts[parts.length - 1];
    const typeStr = parts[parts.length - 2]; // "videos" or "guides"
    const courseId = parts[parts.length - 3];

    if (typeStr !== "videos" && typeStr !== "guides") return null;

    return this.findAsset(courseId, typeStr, filename);
  }

  /**
   * Saves a new search path to the config file.
   */
  saveNewPath(p: string, label: string): void {
    if (!this.config) return;

    // Avoid duplicates
    if (this.config.searchPaths.some((sp) => sp.path === p)) return;

    this.config.searchPaths.push({ path: p, label });
    this.fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Removes a search path from the config file.
   */
  removePath(p: string): void {
    if (!this.config) return;
    this.config.searchPaths = this.config.searchPaths.filter(
      (sp) => sp.path !== p
    );
    this.fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Lists all existing files in a specific course asset directory across all search paths.
   */
  listAssets(courseId: string, type: "videos" | "guides"): string[] {
    const results: string[] = [];
    const relativePath = this.fs.join(String(courseId), type);
    const availablePaths = this.getAvailablePaths().filter((p) => p.available);

    for (const sp of availablePaths) {
      const fullDir = this.fs.join(sp.fullPath, relativePath);
      if (this.fs.existsSync(fullDir)) {
        try {
          const files = this.fs.readdirSync(fullDir);
          files.forEach((f) => results.push(this.fs.join(fullDir, f)));
        } catch (e) {
          console.error(`Error listing assets in ${fullDir}:`, e);
        }
      }
    }
    return results;
  }
}
