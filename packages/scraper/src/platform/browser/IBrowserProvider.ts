import { BrowserContext } from "playwright";

export interface IBrowserProvider {
  /** Gets an existing context or creates a new headful one primarily for Login purposes */
  getHeadfulContext(headless?: boolean): Promise<BrowserContext>;

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  getAuthenticatedContext(): Promise<BrowserContext>;

  /** Closes the browser and context */
  close(): Promise<void>;
}
