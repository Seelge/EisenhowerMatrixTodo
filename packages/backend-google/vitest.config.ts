import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend-google',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
