import { chromium } from "playwright-extra";
import { type Browser, type BrowserContext } from "playwright";
import stealth from "puppeteer-extra-plugin-stealth";

import type { IFileSystem, IPath } from "@core/filesystem";
import type { ILogger } from '@core/logging';
import type { IBrowserProvider } from "./IBrowserProvider";

chromium.use(stealth());

export interface BrowserProviderConfig {
  chromeExecutablePath?: string;
  authStateFile: string;
}

export class BrowserProvider implements IBrowserProvider {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private logger?: ILogger;
  private fs: IFileSystem;
  private path: IPath;
  private config: BrowserProviderConfig;

  constructor(deps: {
    fs: IFileSystem,
    path: IPath,
    config: BrowserProviderConfig,
    logger?: ILogger
  }) {
    this.fs = deps.fs;
    this.path = deps.path;
    this.config = deps.config;
    this.logger = deps.logger?.withContext("BrowserProvider");
  }

  /** Gets an existing context or creates a new headful one primarily for Login purposes */
  async getHeadfulContext(headless: boolean = false): Promise<BrowserContext> {
    if (!this.browser) {
      this.logger?.info(`Lanzando navegador chromium (headless: ${headless})...`);
      this.browser = await chromium.launch({
        headless,
        executablePath: this.config.chromeExecutablePath || undefined,
        channel: this.config.chromeExecutablePath ? undefined : "chrome",
        args: [
          "--start-maximized",
          "--disable-blink-features=AutomationControlled"
        ]
      });

      this.browser.on('disconnected', () => {
        this.logger?.info('Canal de comunicación con el navegador cerrado.');
        this.browser = null;
        this.context = null;
      });
    }

    // Always use state if it exists
    const stats = await this.fs.stat(this.config.authStateFile).catch(() => null);

    if (stats) {
      // stats.mtime might not be present in all IFileSystem implementations if not standardized, 
      // but NodeFileSystem has it. For now we assume if it exists we check age if possible.
      // @ts-ignore
      const mtime = stats.mtime || new Date();
      const hoursOld = (Date.now() - mtime.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        this.logger?.warn(`La sesión guardada tiene ${Math.round(hoursOld)} horas. Si falla el raseo, prueba a ejecutar 'pnpm cli login' de nuevo.`);
      }
    }

    const exists = stats !== null;
    const contextOptions = exists
      ? { storageState: this.config.authStateFile }
      : {};

    this.context = await this.browser.newContext(contextOptions);
    return this.context;
  }

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  async getAuthenticatedContext(): Promise<BrowserContext> {
    const exists = await this.fs.exists(this.config.authStateFile);
    if (!exists) {
      throw new Error("No existe sesion guardada. Ejecute el login primero.");
    }
    return this.getHeadfulContext(true); // force headless for background ops
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.context = null;
    this.browser = null;
  }
}
