import { describe, expect, it } from 'vitest';
import {
  CALCULATOR_STORAGE_KEY,
  loadCalculatorData,
  saveCalculatorData,
} from './calculator-storage';
import type { GPRFormData } from '@/hooks/useGPRCalculator';

function memoryStore() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const withResult: GPRFormData = {
  numberOfJobs: 1,
  jobs: [
    {
      startMonth: 'January',
      startYear: '2018',
      endMonth: 'December',
      endYear: '2019',
      monthlySalary: 3500,
      sector: 'private',
      state: '',
      supplementaryPension: '',
    },
  ],
  calculationResult: {
    isEligible: true,
    statePensionRefund: 3906,
    supplementaryRefund: 0,
    totalRefund: 3906,
    totalMonthsContributed: 24,
    details: {
      drvEligible: true,
      drvReason: 'With 24 months …',
      supplementaryEligible: false,
      supplementaryReason: 'No supplementary pension contributions found.',
    },
  },
};

describe('calculator storage', () => {
  it('round-trips the jobs and the estimate', () => {
    const store = memoryStore();
    saveCalculatorData(withResult, store);
    expect(loadCalculatorData(store)).toEqual(withResult);
  });

  it('removes the entry when the calculator is reset', () => {
    const store = memoryStore();
    saveCalculatorData(withResult, store);
    saveCalculatorData(
      { numberOfJobs: 0, jobs: [], calculationResult: null },
      store
    );
    expect(store.map.has(CALCULATOR_STORAGE_KEY)).toBe(false);
  });

  it('ignores corrupt or foreign data', () => {
    const store = memoryStore();
    store.setItem(CALCULATOR_STORAGE_KEY, '{not json');
    expect(loadCalculatorData(store)).toBeNull();
    store.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify({ jobs: 'x' }));
    expect(loadCalculatorData(store)).toBeNull();
    store.setItem(
      CALCULATOR_STORAGE_KEY,
      JSON.stringify({ ...withResult, calculationResult: { total: 1 } })
    );
    expect(loadCalculatorData(store)).toBeNull();
  });

  it('is a no-op without storage (server render, blocked storage)', () => {
    expect(loadCalculatorData(null)).toBeNull();
    expect(() => saveCalculatorData(withResult, null)).not.toThrow();
  });

  it('survives a store that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadCalculatorData(broken)).toBeNull();
    expect(() => saveCalculatorData(withResult, broken)).not.toThrow();
  });
});
