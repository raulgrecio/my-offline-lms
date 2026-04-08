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
    const { headless = false } = options;
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
        this.contexts.clear();
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

    const context = await this.browser.newContext(contextOptions);
    this.contexts.add(context);

    // [REACTIVE CANCELLATION] If an AbortSignal is provided, close the context immediately on abort.
    // This force-cancels any pending Playwright operations (goto, waitFor, etc.)
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

    return context;
  }

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  async getAuthenticatedContext(options: {} = {}, signal?: AbortSignal): Promise<BrowserContext> {
    const exists = await this.fs.exists(this.config.authStateFile);
    if (!exists) {
      throw new Error("No existe sesion guardada. Ejecute el login primero.");
    }
    return this.getHeadfulContext({ headless: true }, signal); // force headless for background ops
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
    if (this.contexts.size === 0 && this.browser) {
      const b = this.browser;
      this.browser = null;
      await b.close().catch((e) => {
        this.logger?.error(`Error al cerrar el navegador: ${e.message}`);
      });
    }
  }

  async close(): Promise<void> {
    for (const ctx of this.contexts) {
      await ctx.close().catch(() => { });
    }
    this.contexts.clear();

    if (this.browser) await this.browser.close();
    this.browser = null;
  }
}
