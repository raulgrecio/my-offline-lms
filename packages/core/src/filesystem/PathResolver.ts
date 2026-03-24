import type { IFileSystem } from "./IFileSystem";
import type { IPath } from "./IPath";

export interface PathResolverOptions {
  fs: IFileSystem;
  path: IPath;
  env?: Record<string, string | undefined>;
  startDir?: string;
}

export class PathResolver {
  private fs: IFileSystem;
  private path: IPath;
  private env: Record<string, string | undefined>;
  private startDir: string;
  private _monorepoRoot: string | null = null;

  constructor(options: PathResolverOptions) {
    this.fs = options.fs;
    this.path = options.path;
    this.env = options.env || process.env;
    this.startDir = options.startDir || process.cwd();
    
    if (!this.path) {
      throw new Error("PathResolver requires a path adapter (IPath)");
    }
  }

  async getMonorepoRoot(): Promise<string> {
    if (this._monorepoRoot) return this._monorepoRoot;

    let currentDir = this.path.resolve(this.startDir);
    // Note: this might differ on Windows if we don't use absolute paths
    const root = this.path.resolve("/");

    while (currentDir !== this.path.dirname(currentDir)) {
      if (await this.fs.exists(this.path.join(currentDir, "pnpm-workspace.yaml"))) {
        this._monorepoRoot = currentDir;
        return currentDir;
      }
      currentDir = this.path.dirname(currentDir);
    }

    // Fallback if not found (shouldn't happen in monorepo, but for safety)
    return this.path.resolve(this.startDir);
  }

  async getDataRoot(): Promise<string> {
    const dataDir = this.env.DATA_DIR || "data";
    if (this.path.isAbsolute(dataDir)) {
      return dataDir;
    }
    const root = await this.getMonorepoRoot();
    return this.path.join(root, dataDir);
  }

  async getDbPath(filename: string = "db.sqlite"): Promise<string> {
    return this.path.join(await this.getDataRoot(), filename);
  }

  async getAssetConfigPath(filename: string = "asset-paths.json"): Promise<string> {
    return this.path.join(await this.getDataRoot(), filename);
  }

  async getWebRoot(): Promise<string> {
    return this.path.join(await this.getMonorepoRoot(), "packages", "web");
  }

  async getScraperRoot(): Promise<string> {
    return this.path.join(await this.getMonorepoRoot(), "packages", "scraper");
  }
}
