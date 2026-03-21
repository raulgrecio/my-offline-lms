import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@filesystem': path.resolve(__dirname, './src/filesystem'),
      '@database': path.resolve(__dirname, './src/database'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@core': path.resolve(__dirname, './src')
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'test', '**/*.test.ts']
    }
  }
});
