import { z } from 'zod';
import dotenv from 'dotenv';

// Load variables if they haven't been loaded yet by the entrypoint
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const envSchema = z.object({
  PLATFORM_BASE_URL: z.url(),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  LOGIN_SUCCESS_SELECTOR: z.string().default("body"),

  // PDF download configurations
  KEEP_TEMP_IMAGES: z.coerce.boolean().default(false),
  CREATE_PDF: z.coerce.boolean().default(true),
  OPTIMIZE_IMAGES: z.coerce.boolean().default(true),
  IMAGE_QUALITY: z.coerce.number().int().min(1).max(100).default(80),

  // Limpieza
  KEEP_TEMP_WORKSPACES: z.coerce.boolean().default(false),

  // DATA_DIR for shared database and assets
  DATA_DIR: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables. Verifique su archivo .env:");
  console.error(z.treeifyError(parsed.error));
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env: Env = parsed.success ? parsed.data : {} as Env;
