import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend-core',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
