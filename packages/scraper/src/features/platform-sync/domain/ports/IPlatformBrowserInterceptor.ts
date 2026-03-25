import { Page } from 'playwright';

export interface IPlatformBrowserInterceptor {
  setup(page: Page, options?: { execTimestamp: number, prefix: string }): Promise<string>;
}
