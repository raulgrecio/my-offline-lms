import { z } from 'zod';

/**
 * Validated environment variables for the web package.
 * Follows the pattern established in the scraper package.
 */
const envSchema = z.object({
  /** Language for subtitles, e.g., 'es', 'en' */
  SUBTITLE_LANGUAGE: z.string().default('es'),

  /** Other variables can be added here */
});

type Env = z.infer<typeof envSchema>;

// In Astro, we access environment variables via import.meta.env
// but it only includes variables prefixed with PUBLIC_ unless we are in SSR
// Since we are using SSR (prerender = false), we can also use process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid web environment variables:");
  console.error(z.treeifyError(parsed.error));
}

export const env: Env = parsed.success ? parsed.data : envSchema.parse({});
