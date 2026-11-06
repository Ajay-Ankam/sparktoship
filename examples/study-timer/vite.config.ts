import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    // Vitest configuration — runs in Node, no browser needed for logic tests
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
