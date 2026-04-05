import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { NodePath } from '@core/filesystem';
import { logger } from '@scraper/platform/logging';

// Schema definition
const envSchema = z.object({
  PLATFORM_BASE_URL: z.url(),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  LOGIN_SUCCESS_SELECTOR: z.string().default("body"),

  // PDF download configurations
  KEEP_TEMP_IMAGES: z.coerce.boolean().default(false),
  CREATE_PDF: z.coerce.boolean().default(true),
  OPTIMIZE_IMAGES: z.coerce.boolean().default(true),
  IMAGE_QUALITY: z.coerce.number().int().min(1).max(100).default(80),

  // Cleanup
  KEEP_TEMP_WORKSPACES: z.coerce.boolean().default(false),

  // DATA_DIR for shared database and assets
  DATA_DIR: z.string().optional(),

  // Debugging
  DEBUG: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

// Live dynamic binding for the env object
export let env: Env = {} as Env;

/**
 * Explicitly load environment variables for the scraper.
 * Useful for library usage where path might be different than current CWD.
 */
export function loadScraperEnv(options?: { path?: string }) {
  // If already loaded and valid, skip
  if (env.PLATFORM_BASE_URL) return env;

  const nodePath = new NodePath();
  let envPath = options?.path;

  if (!envPath) {
    const fileName = '.env';

    try {
      // Cross-platform ESM/CJS path resolution
      const currentFile = typeof import.meta.url !== 'undefined'
        ? fileURLToPath(import.meta.url)
        : (typeof __filename !== 'undefined' ? __filename : '');

      const baseDir = nodePath.dirname(currentFile);
      envPath = nodePath.join(baseDir, '../../', fileName);
    } catch (e) {
      // Fallback to current working directory as last resort
      envPath = nodePath.join(process.cwd(), fileName);
    }
  }

  dotenv.config({ path: envPath });

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorMsg = z.treeifyError(parsed.error);
    logger.error("❌ Invalid environment variables. Verifique su archivo .env:", errorMsg);
    process.exit(1);
  }

  env = parsed.success ? parsed.data : {} as Env;
  return env;
}
