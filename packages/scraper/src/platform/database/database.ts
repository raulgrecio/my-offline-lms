import { IDatabase } from '@my-offline-lms/core/database';
import { createLazyService } from '@my-offline-lms/core/di';
import { initDb, InitDbOptions } from './schema';

/**
 * Singleton database connection for the scraper.
 * Uses lazy initialization to ensure it's only created once and
 * only when actually needed.
 */
export const getDb = createLazyService(async (options?: InitDbOptions): Promise<IDatabase> => {
  return initDb(options);
});
