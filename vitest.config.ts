import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    transformMode: { web: [/\.[jt]sx?$/] },
    setupFiles: ['node_modules/@testing-library/jest-dom/vitest'],
    // if you have few tests, keep them fast by isolating environment
    isolate: false,
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
});
