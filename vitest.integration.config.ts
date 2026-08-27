import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Integration tests (`npm run test:db`). Kept out of `npm test` because they need a
 * real database and credentials, which CI does not have.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // A round trip to Sydney is slower than the pure unit suite's default allows.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
