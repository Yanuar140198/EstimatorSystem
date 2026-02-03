import { describe, expect, it } from 'vitest';
import { applyProjectAddons, calculateAhspTotals, calculateLineTotal } from './ahsp.js';

describe('AHSP calculations', () => {
  it('calculates totals with overhead and profit', () => {
    const totals = calculateAhspTotals({
      lines: [
        { type: 'material', coefficient: 1.2, unitPrice: 100_000 },
        { type: 'labor', coefficient: 0.5, unitPrice: 80_000 }
      ],
      overheadPct: 10,
      profitPct: 5
    });

    expect(totals.directCost).toBe(160000);
    expect(totals.markup).toBe(24000);
    expect(totals.unitRate).toBe(184000);
  });

  it('calculates line totals', () => {
    expect(calculateLineTotal(2, 150000)).toBe(300000);
  });

  it('applies contingency and ppn', () => {
    const result = applyProjectAddons(1_000_000, 2, 11);
    expect(result.contingency).toBe(20000);
    expect(result.ppn).toBe(112200);
    expect(result.grandTotal).toBe(1_132_200);
  });
});
