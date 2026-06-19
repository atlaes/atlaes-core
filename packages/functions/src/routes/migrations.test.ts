import { describe, expect, it } from 'vitest';
import { isLegacyDB } from './migrations';

function fakeExecutor(results: boolean[]) {
  const calls: unknown[] = [];

  return {
    calls,
    db: {
      async execute(query: unknown) {
        calls.push(query);
        return [{ exists: results.shift() ?? false }];
      },
    },
  };
}

describe('migration legacy database detection', () => {
  it('does not baseline when Drizzle migration tracking already exists', async () => {
    const { calls, db } = fakeExecutor([true]);

    await expect(isLegacyDB(db)).resolves.toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('does not baseline a fresh database without the legacy shared users table', async () => {
    const { calls, db } = fakeExecutor([false, false]);

    await expect(isLegacyDB(db)).resolves.toBe(false);
    expect(calls).toHaveLength(2);
  });

  it('baselines only when tracking is missing and the legacy schema exists', async () => {
    const { calls, db } = fakeExecutor([false, true]);

    await expect(isLegacyDB(db)).resolves.toBe(true);
    expect(calls).toHaveLength(2);
  });
});
