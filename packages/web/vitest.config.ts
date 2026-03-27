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
        "@config": path.resolve(__dirname, "./src/config"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@features": path.resolve(__dirname, "./src/features"),
        "@layouts": path.resolve(__dirname, "./src/layouts"),
        "@lib": path.resolve(__dirname, "./src/lib"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@platform": path.resolve(__dirname, "./src/platform"),
      },
    },
  })
);