import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend-microsoft',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
