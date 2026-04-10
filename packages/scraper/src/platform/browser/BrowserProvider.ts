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

const BROWSER_TYPES = ['headful', 'headless'] as const;
type BrowserType = typeof BROWSER_TYPES[number];

export class BrowserProvider implements IBrowserProvider {
  private browsers: Record<BrowserType, Browser | null> = {
    headful: null,
    headless: null
  };
  private contexts: Set<BrowserContext> = new Set();
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
  async getHeadfulContext(options: { headless?: boolean } = {}, signal?: AbortSignal): Promise<BrowserContext> {
    const { context } = await this._getContext(options, signal);
    return context;
  }

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  async getAuthenticatedContext(options: {} = {}, signal?: AbortSignal): Promise<BrowserContext> {
    const { context, sessionLoaded } = await this._getContext({ headless: true }, signal);

    if (!sessionLoaded) {
      await this.closeContext(context);
      throw new Error("No existe sesión guardada o ha sido eliminada. Ejecute el login primero.");
    }

    return context;
  }

  private async _getContext(options: { headless?: boolean } = {}, signal?: AbortSignal): Promise<{ context: BrowserContext; sessionLoaded: boolean }> {
    const { headless = false } = options;
    const type: BrowserType = headless ? 'headless' : 'headful';

    if (!this.browsers[type]) {
      this.logger?.info(`Lanzando navegador chromium (headless: ${headless})...`);
      this.browsers[type] = await chromium.launch({
        headless,
        executablePath: this.config.chromeExecutablePath || undefined,
        channel: this.config.chromeExecutablePath ? undefined : "chrome",
        args: [
          "--start-maximized",
          "--disable-blink-features=AutomationControlled"
        ]
      });

      const browserInstance = this.browsers[type]!;
      browserInstance.on('disconnected', () => {
        this.logger?.info(`Canal de comunicación con el navegador (${type}) cerrado.`);
        this.browsers[type] = null;

        for (const ctx of this.contexts) {
          try {
            if (ctx.browser() === browserInstance) {
              this.contexts.delete(ctx);
            }
          } catch (e) {
            this.contexts.delete(ctx);
          }
        }
      });
    }

    const currentBrowser = this.browsers[type]!;

    // Perform a single stat() call to check existence and age
    const stats = await this.fs.stat(this.config.authStateFile).catch(() => null);
    const exists = stats !== null;

    if (stats) {
      // @ts-ignore
      const mtime = stats.mtime || new Date();
      const hoursOld = (Date.now() - mtime.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        this.logger?.warn(`La sesión guardada tiene ${Math.round(hoursOld)} horas. Si falla el raseo, prueba a ejecutar 'pnpm cli login' de nuevo.`);
      }
    }

    const contextOptions = exists
      ? { storageState: this.config.authStateFile }
      : {};

    const context = await currentBrowser.newContext(contextOptions);
    this.contexts.add(context);

    if (signal) {
      if (signal.aborted) {
        this.closeContext(context).catch(() => { });
      } else {
        signal.addEventListener('abort', () => {
          this.logger?.info('Señal de aborto recibida. Cerrando contexto de navegador inmediatamente...');
          this.closeContext(context).catch(() => { });
        }, { once: true });
      }
    }

    return { context, sessionLoaded: exists };
  }

  async closeContext(context: BrowserContext): Promise<void> {
    if (this.contexts.has(context)) {
      this.contexts.delete(context);
      // We don't strictly await here to avoid deadlocks if the browser is already closing/closed
      await context.close().catch((e) => {
        this.logger?.error(`Error al cerrar el contexto: ${e.message}`);
      });
    }

    // Auto-close browser if no more contexts are alive
    for (const type of BROWSER_TYPES) {
      const b = this.browsers[type];
      if (b && b.contexts().length === 0) {
        this.browsers[type] = null;
        await b.close().catch((e) => {
          this.logger?.error(`Error al cerrar el navegador (${type}): ${e.message}`);
        });
      }
    }
  }

  async close(): Promise<void> {
    for (const ctx of this.contexts) {
      await ctx.close().catch(() => { });
    }
    this.contexts.clear();

    for (const type of BROWSER_TYPES) {
      const b = this.browsers[type];
      if (b) await b.close();
      this.browsers[type] = null;
    }
  }
}
