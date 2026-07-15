import { XMLParser } from 'fast-xml-parser';
import type { CfgParseResult, CfgCstic, CfgCondition, ParsedQuote } from '@/types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) => ['CSTIC', 'CONDITION', 'PKEY', 'INST'].includes(name),
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseCfgFile(xmlText: string, fileName: string): CfgParseResult {
  const doc = parser.parse(xmlText);
  const config = doc?.CONFIGURATION ?? {};
  const inst = asArray(config?.INST)[0] ?? {};
  const cstics = asArray(inst?.CSTICS?.CSTIC);
  const conditions = asArray(config?.CONDITIONS?.CONDITION);

  const header = {
    fileName,
    kbName: config?.KBNAME ?? '',
    kbVersion: config?.KBVERSION ?? '',
    kbBuild: config?.KBBUILD ?? '',
    kbProfile: config?.KBPROFILE ?? '',
    materialNo: inst?.OBJ_KEY ?? '',
    qty: inst?.QTY ?? '',
    unit: inst?.UNIT ?? '',
    classType: inst?.CLASS_TYPE ?? '',
    objType: inst?.OBJ_TYPE ?? '',
    language: config?.LANGUAGE ?? '',
  };

  const csticRows: CfgCstic[] = cstics.map((c: Record<string, string>) => ({
    charc: c?.CHARC ?? '',
    value: c?.VALUE ?? '',
    author: c?.AUTHOR ?? '',
    invisible: c?.INVISIBLE === 'T' ? 'Yes' : '',
  }));

  const conditionRows: CfgCondition[] = conditions.map((c: Record<string, string>) => ({
    type: c?.TYPE ?? '',
    name: c?.NAME ?? '',
    pricingUnit: c?.PRICINGUNIT ?? '',
    pricingValue: c?.PRICINGVALUE ?? '',
    rateUnit: c?.RATEUNIT ?? '',
    rateValue: c?.RATEVALUE ?? '',
  }));

  return { header, cstics: csticRows, conditions: conditionRows };
}

function toNum(v: string): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Adapts CFG pricing conditions into the same ParsedQuote shape used by the
 * Excel flow, so the invoice generator can be reused for CFG uploads too.
 * CFG conditions carry a single calculated RATEVALUE (no separate net/gross),
 * so it's used for both unit and total price.
 */
export function cfgToParsedQuote(data: CfgParseResult): ParsedQuote {
  const { header, conditions } = data;

  const items = conditions.map((c) => {
    const amount = toNum(c.rateValue);
    return {
      code: c.type,
      feature: c.name,
      value: [c.pricingValue, c.pricingUnit].filter(Boolean).join(' '),
      description: '',
      unitPriceGross: amount,
      unitPriceNet: null,
      totalPriceNet: null,
      totalPriceGross: amount,
      conditionType: c.rateUnit,
    };
  });

  const grandTotal = items.length
    ? items.reduce((sum, it) => sum + (it.totalPriceGross || 0), 0)
    : null;

  return {
    title: [header.kbName, header.kbVersion].filter(Boolean).join(' / '),
    date: '',
    kbVersion: header.kbVersion,
    customer: '',
    quantity: [header.qty, header.unit].filter(Boolean).join(' '),
    materialNo: header.materialNo,
    sections: [{ name: 'Pricing Conditions', items, subtotal: grandTotal ?? 0 }],
    summary: [{ label: 'Total price for all items', netTotal: null, grossTotal: grandTotal, condition: '' }],
    grandTotal,
    sourceFile: header.fileName,
  };
}
