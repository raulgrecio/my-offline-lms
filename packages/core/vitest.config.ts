import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@core': path.resolve(__dirname, './src'),
    },
    setupFiles: [path.resolve(__dirname, './src/tests/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'test', '**/*.test.ts']
    }
  }
});
