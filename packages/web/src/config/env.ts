import { z } from 'zod';
import { logger } from '@platform/logging';

/**
 * Validated environment variables for the web package.
 * Follows the pattern established in the scraper package.
 */
const envSchema = z.object({
  /** Language for subtitles, e.g., 'es', 'en' */
  SUBTITLE_LANGUAGE: z.string().default('es'),

  /** Path to the data directory (database and assets) */
  DATA_DIR: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

// In Astro, we access environment variables via import.meta.env
// but it only includes variables prefixed with PUBLIC_ unless we are in SSR
// Since we are using SSR (prerender = false), we can also use process.env

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error("❌ Invalid web environment variables:");
  logger.error("Environment validation failed", parsed.error);
}

export const env: Env = parsed.success ? parsed.data : envSchema.parse({});
