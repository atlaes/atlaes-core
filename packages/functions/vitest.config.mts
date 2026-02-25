import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**', 'src/routes/**'],
      exclude: ['src/test/**', '**/*.test.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Vitest 4 config: run tests in sequence for DB isolation
    isolate: false,
    fileParallelism: false,
    sequence: {
      shuffle: false,
    },
  },
});
