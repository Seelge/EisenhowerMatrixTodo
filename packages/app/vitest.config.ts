import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'app',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
