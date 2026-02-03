export type AhspLineType = 'material' | 'labor' | 'equipment';

export interface AhspLine {
  type: AhspLineType;
  coefficient: number;
  unitPrice: number;
}

export interface AhspTotalsInput {
  lines: AhspLine[];
  overheadPct: number;
  profitPct: number;
}

export interface AhspTotalsResult {
  directCost: number;
  markup: number;
  unitRate: number;
}

export function calculateAhspTotals({ lines, overheadPct, profitPct }: AhspTotalsInput): AhspTotalsResult {
  const directCost = lines.reduce((sum, line) => sum + line.coefficient * line.unitPrice, 0);
  const markupRate = (overheadPct + profitPct) / 100;
  const markup = directCost * markupRate;
  const unitRate = directCost + markup;
  return {
    directCost: roundCurrency(directCost),
    markup: roundCurrency(markup),
    unitRate: roundCurrency(unitRate)
  };
}

export function calculateLineTotal(quantity: number, unitRate: number) {
  return roundCurrency(quantity * unitRate);
}

export function applyProjectAddons(
  subtotal: number,
  contingencyPct: number,
  ppnPct: number
) {
  const contingency = subtotal * (contingencyPct / 100);
  const subtotalWithContingency = subtotal + contingency;
  const ppn = subtotalWithContingency * (ppnPct / 100);
  return {
    contingency: roundCurrency(contingency),
    ppn: roundCurrency(ppn),
    grandTotal: roundCurrency(subtotalWithContingency + ppn)
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
