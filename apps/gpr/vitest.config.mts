// Plain object on purpose: vitest is not installed in this workspace (the
// offline store has no metadata for it), so `pnpm --filter gpr test` runs the
// binary from packages/functions and this file must not import 'vitest/config'.
const here = new URL('.', import.meta.url).pathname;

export default {
  resolve: {
    alias: { '@': here.replace(/\/$/, '') },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
};
