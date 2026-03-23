import fs from "fs";
import { type IFileSystem } from "./IFileSystem";

export interface PathResolverOptions {
  fs: IFileSystem;
  env?: Record<string, string | undefined>;
  startDir?: string;
}

export class PathResolver {
  private fs: IFileSystem;
  private env: Record<string, string | undefined>;
  private startDir: string;
  private _monorepoRoot: string | null = null;

  constructor(options: PathResolverOptions) {
    this.fs = options.fs;
    this.env = options.env || process.env;
    this.startDir = options.startDir || process.cwd();
  }

  getMonorepoRoot(): string {
    if (this._monorepoRoot) return this._monorepoRoot;

    let currentDir = this.fs.resolve(this.startDir);
    // Note: this might differ on Windows if we don't use absolute paths
    const root = this.fs.resolve("/"); 

    while (currentDir !== this.fs.dirname(currentDir)) {
      // Use native fs.existsSync for bootstrapping as it identifies local files
      if (fs.existsSync(this.fs.join(currentDir, "pnpm-workspace.yaml"))) {
        this._monorepoRoot = currentDir;
        return currentDir;
      }
      currentDir = this.fs.dirname(currentDir);
    }

    // Fallback if not found (shouldn't happen in monorepo, but for safety)
    return this.fs.resolve(this.startDir);
  }

  getDataRoot(): string {
    const dataDir = this.env.DATA_DIR || "data";
    if (this.fs.isAbsolute(dataDir)) {
      return dataDir;
    }
    return this.fs.join(this.getMonorepoRoot(), dataDir);
  }

  getDbPath(filename: string = "db.sqlite"): string {
    return this.fs.join(this.getDataRoot(), filename);
  }

  getAssetConfigPath(filename: string = "asset-paths.json"): string {
    return this.fs.join(this.getDataRoot(), filename);
  }

  getWebRoot(): string {
    return this.fs.join(this.getMonorepoRoot(), "packages", "web");
  }

  getScraperRoot(): string {
    return this.fs.join(this.getMonorepoRoot(), "packages", "scraper");
  }
}
