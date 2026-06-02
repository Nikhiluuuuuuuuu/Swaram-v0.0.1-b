import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  cacheDir: '.vitest-cache',
  test: {
    environment: 'jsdom',
    globals: true,
    transformMode: { web: [/\.[jt]sx?$/] },
    setupFiles: ['test/setup.ts'],
    // if you have few tests, keep them fast by isolating environment
    isolate: false,
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
});
