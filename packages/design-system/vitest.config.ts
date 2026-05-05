import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'design-system',
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
