import { chromium } from "playwright-extra";
import { Browser, BrowserContext } from "playwright";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";

import { env } from "@config/env";
import { AUTH_STATE } from "@config/paths";

chromium.use(stealth());

export class BrowserProvider {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private readonly stateFile: string;

  constructor() {
    this.stateFile = AUTH_STATE;
  }

  /** Gets an existing context or creates a new headful one primarily for Login purposes */
  async getHeadfulContext(headless: boolean = false): Promise<BrowserContext> {
    if (!this.browser) {
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
    const exists = await fs.promises.access(this.stateFile).then(() => true).catch(() => false);
    const contextOptions = exists 
      ? { storageState: this.stateFile } 
      : {};

    this.context = await this.browser.newContext(contextOptions);
    return this.context;
  }

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  async getAuthenticatedContext(): Promise<BrowserContext> {
    const exists = await fs.promises.access(this.stateFile).then(() => true).catch(() => false);
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

// Export a singleton instance for ease of use in most simple scripts, 
// though full DI would prefer passing it around.
export const browserProvider = new BrowserProvider();
