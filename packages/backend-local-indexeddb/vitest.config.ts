import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend-local-indexeddb',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
