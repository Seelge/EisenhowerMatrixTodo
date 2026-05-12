import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    // Mirror the vite.config.ts `define` so the build-info constants
    // resolve under Vitest too. Static literals keep the tests stable
    // regardless of git state.
    __EMT_VERSION__: JSON.stringify('0.0.0-test'),
    __EMT_COMMIT_SHA__: JSON.stringify('test-sha-abcdef0'),
    __EMT_BUILD_TIME__: JSON.stringify('2026-01-01T00:00:00.000Z'),
  },
  test: {
    name: 'app',
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
