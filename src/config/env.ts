import { z } from 'zod';
import dotenv from 'dotenv';

// Load variables if they haven't been loaded yet by the entrypoint
dotenv.config();

const envSchema = z.object({
  PLATFORM_BASE_URL: z.string().url().default("https://mylearn.oracle.com"),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  LOGIN_SUCCESS_SELECTOR: z.string().default("body"),
  
  // PDF download configurations
  KEEP_TEMP_IMAGES: z.coerce.boolean().default(false),
  CREATE_PDF: z.coerce.boolean().default(true),
  OPTIMIZE_IMAGES: z.coerce.boolean().default(true),
  IMAGE_QUALITY: z.coerce.number().int().min(1).max(100).default(80),
  ORACLE_LEARNER_ID: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables. Verifique su archivo .env:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env: Env = parsed.data;
