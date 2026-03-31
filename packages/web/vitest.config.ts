import { defineConfig } from "vitest/config";
import { getViteConfig } from "astro/config";
import path from "path";

export default defineConfig(
  getViteConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./vitest.setup.ts",
      reporters: ["verbose"],
      include: ["tests/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "json-summary", "html"],
        include: ["src/**/*"],
        exclude: [
          "src/**/*.d.ts",
          "src/**/*.test.ts",
          "src/**/*.test.tsx",
        ],
      },
    },

    resolve: {
      alias: {
        "@core": path.resolve(__dirname, "../core/src"),
        "@scraper": path.resolve(__dirname, "../scraper/src"),
        "@web": path.resolve(__dirname, "./src"),
      },
    },
  })
);