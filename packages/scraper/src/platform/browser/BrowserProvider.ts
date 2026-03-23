import { chromium } from "playwright-extra";
import { Browser, BrowserContext } from "playwright";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";

import { env } from "@config/env";
import { getAuthState } from "@config/paths";
import { ILogger } from '@my-offline-lms/core/logging';

chromium.use(stealth());

export class BrowserProvider {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.withContext("BrowserProvider");
  }

  /** Gets an existing context or creates a new headful one primarily for Login purposes */
  async getHeadfulContext(headless: boolean = false): Promise<BrowserContext> {
    if (!this.browser) {
      this.logger?.info(`Lanzando navegador chromium (headless: ${headless})...`);
      this.browser = await chromium.launch({ 
        headless,
        executablePath: env.CHROME_EXECUTABLE_PATH || undefined,
        channel: env.CHROME_EXECUTABLE_PATH ? undefined : "chrome",
        args: [
          "--start-maximized",
          "--disable-blink-features=AutomationControlled"
        ]
      });
    }
    
    // Always use state if it exists
    const stateFile = await getAuthState();
    const stats = await fs.promises.stat(stateFile).catch(() => null);
    
    if (stats) {
      const hoursOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        this.logger?.warn(`La sesión guardada tiene ${Math.round(hoursOld)} horas. Si falla el raseo, prueba a ejecutar 'pnpm cli login' de nuevo.`);
      }
    }

    const contextOptions = stats 
      ? { storageState: stateFile } 
      : {};

    this.context = await this.browser.newContext(contextOptions);
    return this.context;
  }

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  async getAuthenticatedContext(): Promise<BrowserContext> {
    const stateFile = await getAuthState();
    const exists = await fs.promises.access(stateFile).then(() => true).catch(() => false);
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
