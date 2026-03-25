import { Page } from "playwright";

import { type IFileSystem, type IPath } from "@my-offline-lms/core/filesystem";
import { type ILogger } from '@my-offline-lms/core/logging';

export class BrowserInterceptor {
  private fs: IFileSystem;
  private path: IPath;
  private logger: ILogger;
  private getInterceptedDirFn: () => Promise<string>;

  constructor(deps: {
    fs: IFileSystem,
    path: IPath,
    logger: ILogger,
    getInterceptedDir: () => Promise<string>
  }) {
    this.fs = deps.fs;
    this.path = deps.path;
    this.logger = deps.logger.withContext('BrowserInterceptor');
    this.getInterceptedDirFn = deps.getInterceptedDir;
  }

  async setup(page: Page, options?: { execTimestamp: number, prefix: string }): Promise<string> {
    const interceptedDir = await this.getInterceptedDirFn();
    const targetDir = options
      ? this.path.join(interceptedDir, `${options.prefix}_${options.execTimestamp}`)
      : interceptedDir;

    if (!(await this.fs.exists(targetDir))) {
      await this.fs.mkdir(targetDir, { recursive: true });
    }

    page.on("response", async (response) => {
      const url = response.url();
      const headers = response.headers();

      // Filtramos solo respuestas JSON (API calls)
      if (headers["content-type"]?.includes("application/json")) {
        try {
          const json = await response.json();

          // Creamos un nombre de archivo seguro basado en la URL
          const urlObj = new URL(url);
          const safeName = urlObj.pathname.replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '');
          const filename = `${Date.now()}_${safeName}.json`;

          await this.fs.writeFile(
            this.path.join(targetDir, filename),
            JSON.stringify({ url, method: response.request().method(), status: response.status(), data: json }, null, 2)
          );

          this.logger.info(`JSON interceptado y guardado: ${filename}`);
        } catch (e) {
          // Ignorar si el body no se puede parsear
        }
      }
    });

    this.logger.info(`Activado. Guardando respuestas JSON en ${targetDir}`);
    return targetDir;
  }
}
