import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'design-system',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
