import { defineConfig } from 'vitest/config';

// Pure-module config for the DRV pack: no Postgres setup/teardown.
// Run: pnpm exec vitest run --config vitest.pure.config.mts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/services/drv-pack/**/*.test.ts', 'src/services/law-firm-rules.test.ts', 'src/services/law-firm-pack.test.ts', 'src/services/gpr-payout/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60000,
    isolate: false,
    fileParallelism: false,
  },
});
