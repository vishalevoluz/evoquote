import { XMLParser } from 'fast-xml-parser';
import type { CfgParseResult, CfgCstic, CfgCondition } from '@/types';

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
