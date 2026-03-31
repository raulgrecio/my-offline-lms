import { type IDatabase } from '@core/database';
import { createLazyService } from '@core/di';
import { initDb, type InitDbOptions } from './schema';

/**
 * Singleton database connection for the scraper.
 * Uses lazy initialization to ensure it's only created once and
 * only when actually needed.
 */
export const getDb = createLazyService(async (options?: InitDbOptions): Promise<IDatabase> => {
  return initDb(options);
});
