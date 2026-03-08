// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

/** @type {import('@tailwindcss/vite').default} */
// @ts-ignore — tailwindcss/vite plugin types don't align with Vite's PluginOption in this config context
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [react()],
  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
  },
});
