import { type BrowserContext } from "playwright";

export interface IBrowserProvider {
  /** Gets an existing context or creates a new headful one primarily for Login purposes */
  getHeadfulContext(options?: { headless?: boolean }, signal?: AbortSignal): Promise<BrowserContext>;

  /** Gets an authenticated headless context for background tasks (downloading, scraping) */
  getAuthenticatedContext(options?: {}, signal?: AbortSignal): Promise<BrowserContext>;

  /** Closes a specific browser context */
  closeContext(context: BrowserContext): Promise<void>;

  /** Closes the browser and all associated contexts */
  close(): Promise<void>;
}
