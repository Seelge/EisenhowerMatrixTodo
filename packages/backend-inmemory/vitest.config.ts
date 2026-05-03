import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend-inmemory',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
