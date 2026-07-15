import type {
  CfgExtractionJson,
  CfgExtractionResult,
  CfgExtractionSummary,
  CfgFieldStatus,
  CfgManualReviewItem,
  CfgParseResult,
  CfgRawMappingRow,
  CrmTemplateRow,
  ManualInputFieldRow,
} from '@/types';

/** Fixed column order for the "CRM Import Template" sheet. Never reorder — downstream imports key on position. */
export const CRM_TEMPLATE_COLUMNS = [
  'Machine Model',
  'Material Number',
  'Product Key',
  'Load Capacity',
  'Load Centre',
  'Year of Manufacture',
  'Truck Width',
  'Drive Type',
  'Machine Class',
  'Number of Wheels',
  'Mast Available',
  'Mast Type',
  'Lowered Mast Height',
  'Lift Height',
  'Free Lift Height',
  'Capacity at Max Height',
  'Side Shift',
  'Fork Length',
  'Fork Dimension',
  'Additional Hydraulics',
  'Driver Cabin / Driver Space',
  'Cabin Heating',
  'Hydraulic Control Type',
  'Drive Control Type',
  'Parking Brake',
  'Rear View Mirror',
  'Safety System',
  'Reverse Sound Signal',
  'Warning Light',
  'Front Working Lights',
  'Rear Working Lights',
  'Operator Assistance System',
  'Colour',
  'Language / Markings',
  'Battery Compartment',
  'Battery Type',
  'Battery Voltage',
  'Battery Capacity',
  'Number of Batteries',
  'Battery Display',
  'Central Water Filling System',
  'Charger Available',
  'Charging Time',
  'Charger Voltage',
  'Charger Current',
  'Manufacturer',
  'Raw CFG File Name',
  'Extraction Status',
  'Manual Review Required',
  'Notes',
] as const;

/** Columns computed from run metadata rather than looked up in the CFG — excluded from mapping-confidence math. */
const META_COLUMNS = new Set<string>([
  'Raw CFG File Name',
  'Extraction Status',
  'Manual Review Required',
  'Notes',
]);

/** Fields that can never come from a CFG upload — always listed for manual completion before offer generation. */
export const MANUAL_INPUT_FIELDS: ManualInputFieldRow[] = [
  { fieldName: 'Battery Supplier', reason: 'Commercial decision, not part of machine configuration', requiredForOffer: 'Yes', exampleValue: 'Hoppecke' },
  { fieldName: 'Battery Override Specification', reason: 'May differ from configured battery if customer requests a change', requiredForOffer: 'No', exampleValue: '' },
  { fieldName: 'Battery Cost', reason: 'Pricing data not present in CFG', requiredForOffer: 'Yes', exampleValue: '' },
  { fieldName: 'Charger Supplier', reason: 'Commercial decision, not part of machine configuration', requiredForOffer: 'Yes', exampleValue: 'Fronius' },
  { fieldName: 'Charger Override Specification', reason: 'May differ from configured charger if customer requests a change', requiredForOffer: 'No', exampleValue: '' },
  { fieldName: 'Charger Cost', reason: 'Pricing data not present in CFG', requiredForOffer: 'Yes', exampleValue: '' },
  { fieldName: 'Attachment Details', reason: 'Attachments are quoted separately from the base CFG configuration', requiredForOffer: 'No', exampleValue: '' },
  { fieldName: 'Transport Cost', reason: 'Logistics cost, not part of machine configuration', requiredForOffer: 'Yes', exampleValue: '' },
  { fieldName: 'Installation Cost', reason: 'Service cost, not part of machine configuration', requiredForOffer: 'No', exampleValue: '' },
  { fieldName: 'Discount', reason: 'Commercial/sales decision', requiredForOffer: 'Yes', exampleValue: '' },
  { fieldName: 'Margin Percentage', reason: 'Internal commercial figure, not present in CFG', requiredForOffer: 'Yes', exampleValue: '' },
  { fieldName: 'Payment Terms', reason: 'Agreed per customer/deal', requiredForOffer: 'Yes', exampleValue: 'Net 30' },
  { fieldName: 'Delivery Timeline', reason: 'Depends on stock/production, not part of CFG', requiredForOffer: 'Yes', exampleValue: '' },
  { fieldName: 'Warranty Terms', reason: 'Commercial policy, not part of machine configuration', requiredForOffer: 'Yes', exampleValue: '12 months' },
  { fieldName: 'Final Selling Price', reason: 'Computed after cost, margin and discount are applied', requiredForOffer: 'Yes', exampleValue: '' },
];

type FieldResult = { value: string; status: CfgFieldStatus; note: string; cfgKeys: string[] };

interface BuildCtx {
  header: CfgParseResult['header'];
  getVal: (...keys: string[]) => string | undefined;
  /** Like getVal, but also reports which key in the fallback list actually matched. */
  pick: (...keys: string[]) => { value: string; key: string } | undefined;
}

function mapped(value: string, cfgKeys: string[], note = 'Direct value from CFG'): FieldResult {
  return { value, status: 'Mapped', cfgKeys, note };
}

function mappingRequired(value: string, cfgKeys: string[], note: string): FieldResult {
  return { value, status: 'Mapping Required', cfgKeys, note };
}

function manualRequired(note: string): FieldResult {
  return { value: '', status: 'Manual Input Required', cfgKeys: [], note };
}

/** One compute function per fixed column. Order must match CRM_TEMPLATE_COLUMNS (checked at build time in tests/dev). */
const FIELD_COMPUTERS: Record<string, (ctx: BuildCtx) => FieldResult> = {
  'Machine Model': ({ getVal }) => {
    const v = getVal('IC_PRODKZ');
    return v ? mapped(v, ['IC_PRODKZ']) : manualRequired('IC_PRODKZ not present in CFG');
  },
  'Material Number': ({ getVal, header }) => {
    const v = getVal('OC_MATERIALNR') || header.materialNo;
    return v ? mapped(v, ['OC_MATERIALNR']) : manualRequired('OC_MATERIALNR not present in CFG');
  },
  'Product Key': ({ getVal, header }) => {
    const v = getVal('OC_MATERIALNR') || header.materialNo;
    return v
      ? mapped(v, ['OC_MATERIALNR'], 'CFG does not expose a distinct product key characteristic; reused from OC_MATERIALNR per mapping spec')
      : manualRequired('OC_MATERIALNR not present in CFG');
  },
  'Load Capacity': ({ getVal }) => {
    const v = getVal('IC_TG_TRAGF_N');
    return v ? mapped(v, ['IC_TG_TRAGF_N']) : manualRequired('IC_TG_TRAGF_N not present in CFG');
  },
  'Load Centre': ({ getVal }) => {
    const v = getVal('IC_509980_4_LSP');
    return v ? mapped(v, ['IC_509980_4_LSP']) : manualRequired('IC_509980_4_LSP not present in CFG');
  },
  'Year of Manufacture': () => manualRequired('CFG does not contain a manufacture date characteristic'),
  'Truck Width': ({ getVal }) => {
    const v = getVal('SC_WIDTH');
    return v ? mapped(v, ['SC_WIDTH']) : manualRequired('SC_WIDTH not present in CFG');
  },
  'Drive Type': () => manualRequired('No known CFG characteristic maps to drive type'),
  'Machine Class': ({ header }) => {
    return header.classType
      ? mappingRequired(header.classType, ['INST.CLASS_TYPE'], 'SAP variant-config class type code; needs mapping dictionary to a readable machine class')
      : manualRequired('INST CLASS_TYPE attribute not present in CFG');
  },
  'Number of Wheels': () => manualRequired('No known CFG characteristic maps to wheel count'),
  'Mast Available': ({ getVal }) => {
    const v = getVal('IC_563700_1_02_TP');
    return v
      ? mapped('Yes', ['IC_563700_1_02_TP'], 'Derived: mast technical data (IC_563700_1_02_TP) present in CFG')
      : manualRequired('No mast technical data characteristic present in CFG');
  },
  'Mast Type': ({ getVal }) => {
    const v = getVal('IC_563700_1_02_ART');
    return v
      ? mappingRequired(v, ['IC_563700_1_02_ART'], 'Mast type letter code; needs mapping dictionary (e.g. duplex/triplex)')
      : manualRequired('IC_563700_1_02_ART not present in CFG');
  },
  'Lowered Mast Height': ({ getVal }) => {
    const v = getVal('SC_563700_1_02_HOE');
    return v ? mapped(v, ['SC_563700_1_02_HOE']) : manualRequired('SC_563700_1_02_HOE not present in CFG');
  },
  'Lift Height': ({ getVal }) => {
    const v = getVal('SC_563700_1_02_NHU');
    return v ? mapped(v, ['SC_563700_1_02_NHU']) : manualRequired('SC_563700_1_02_NHU not present in CFG');
  },
  'Free Lift Height': ({ getVal }) => {
    const v = getVal('SC_TECHDATA_1_H2');
    return v ? mapped(v, ['SC_TECHDATA_1_H2']) : manualRequired('SC_TECHDATA_1_H2 not present in CFG');
  },
  'Capacity at Max Height': ({ getVal }) => {
    const v = getVal('SC_563700_1_02_QBN');
    return v ? mapped(v, ['SC_563700_1_02_QBN']) : manualRequired('SC_563700_1_02_QBN not present in CFG');
  },
  'Side Shift': ({ getVal }) => {
    const v = getVal('IC_SET_SIDESHIFT');
    return v
      ? mappingRequired(v, ['IC_SET_SIDESHIFT', 'IC_509980_104_SS'], 'Conflicting side-shift indicator flags found in CFG (IC_SET_SIDESHIFT vs IC_509980_104_SS); confirm manually')
      : manualRequired('No side shift characteristic present in CFG');
  },
  'Fork Length': ({ getVal }) => {
    const v = getVal('IC_509980_1_07_L');
    return v ? mapped(v, ['IC_509980_1_07_L']) : manualRequired('IC_509980_1_07_L not present in CFG');
  },
  'Fork Dimension': ({ getVal }) => {
    const v = getVal('IC_509980_1_07_Q');
    return v ? mapped(v, ['IC_509980_1_07_Q']) : manualRequired('IC_509980_1_07_Q not present in CFG');
  },
  'Additional Hydraulics': () => manualRequired('No known CFG characteristic maps to additional hydraulics'),
  'Driver Cabin / Driver Space': () => manualRequired('No known CFG characteristic maps to driver cabin/space'),
  'Cabin Heating': () => manualRequired('No known CFG characteristic maps to cabin heating'),
  'Hydraulic Control Type': () => manualRequired('No known CFG characteristic maps to hydraulic control type'),
  'Drive Control Type': () => manualRequired('No known CFG characteristic maps to drive control type'),
  'Parking Brake': () => manualRequired('No known CFG characteristic maps to parking brake'),
  'Rear View Mirror': () => manualRequired('No known CFG characteristic maps to rear view mirror'),
  'Safety System': () => manualRequired('No known CFG characteristic maps to safety system'),
  'Reverse Sound Signal': () => manualRequired('No known CFG characteristic maps to reverse sound signal'),
  'Warning Light': () => manualRequired('No known CFG characteristic maps to warning light'),
  'Front Working Lights': () => manualRequired('No known CFG characteristic maps to front working lights'),
  'Rear Working Lights': () => manualRequired('No known CFG characteristic maps to rear working lights'),
  'Operator Assistance System': ({ getVal }) => {
    const v = getVal('IC_PWFLEETFRAGE1');
    return v
      ? mappingRequired(v, ['IC_PWFLEETFRAGE1', 'SC_PWFLEETOPERATOR1'], 'Fleet/operator identification flag found in CFG; needs mapping dictionary to confirm the operator assistance feature')
      : manualRequired('No operator assistance characteristic present in CFG');
  },
  Colour: () => manualRequired('No known CFG characteristic maps to colour'),
  'Language / Markings': ({ header }) => {
    return header.language
      ? mappingRequired(header.language, ['CONFIGURATION.LANGUAGE'], 'Language code needs mapping dictionary')
      : manualRequired('CONFIGURATION LANGUAGE attribute is empty in source file');
  },
  'Battery Compartment': ({ pick }) => {
    const p = pick('SC_TROG', 'IC_TROG');
    return p
      ? mappingRequired(p.value, [p.key], 'Battery compartment (Trog) code; needs mapping dictionary')
      : manualRequired('SC_TROG / IC_TROG not present in CFG');
  },
  'Battery Type': ({ getVal }) => {
    const v = getVal('IC_LDG_BAT_TYP');
    return v
      ? mappingRequired(v, ['IC_LDG_BAT_TYP'], 'Battery type code; needs mapping dictionary')
      : manualRequired('IC_LDG_BAT_TYP not present in CFG');
  },
  'Battery Voltage': ({ pick }) => {
    const p = pick('IC_VOLT', 'IC_LDG_VOLT');
    return p ? mapped(p.value, [p.key]) : manualRequired('IC_VOLT / IC_LDG_VOLT not present in CFG');
  },
  'Battery Capacity': ({ getVal }) => {
    const v = getVal('IC_BA_CAP');
    return v ? mapped(v, ['IC_BA_CAP']) : manualRequired('IC_BA_CAP not present in CFG');
  },
  'Number of Batteries': ({ pick }) => {
    const p = pick('SCX_BA_QUAN', 'ICX_BA_QUAN', 'IC_BATNO');
    return p ? mapped(p.value, [p.key]) : manualRequired('No battery quantity characteristic present in CFG');
  },
  'Battery Display': () => manualRequired('No known CFG characteristic maps to battery display'),
  'Central Water Filling System': () => manualRequired('No known CFG characteristic maps to central water filling system'),
  'Charger Available': ({ getVal }) => {
    const v = getVal('IC_509880_3_I');
    // Derived flag only — deliberately omits cfgKeys so it doesn't claim credit for the raw key in
    // the Raw CFG Mapping sheet; "Charger Current" below is the direct, more specific mapping of it.
    return v
      ? mapped('Yes', [], 'Derived: charger current characteristic (IC_509880_3_I) present in CFG')
      : manualRequired('No charger characteristics present in CFG');
  },
  'Charging Time': () => manualRequired('No known CFG characteristic maps to charging time'),
  'Charger Voltage': ({ getVal }) => {
    const v = getVal('IC_LDG_VOLT');
    return v ? mapped(v, ['IC_LDG_VOLT']) : manualRequired('IC_LDG_VOLT not present in CFG');
  },
  'Charger Current': ({ getVal }) => {
    const v = getVal('IC_509880_3_I');
    return v ? mapped(v, ['IC_509880_3_I']) : manualRequired('IC_509880_3_I not present in CFG');
  },
  Manufacturer: ({ getVal }) => {
    const link = getVal('IC_SHORTLINK');
    return manualRequired(
      link
        ? `Not directly stored in CFG; IC_SHORTLINK ("${link}") suggests the OEM domain — confirm manually`
        : 'No manufacturer characteristic present in CFG'
    );
  },
};

function snakeCase(column: string): string {
  return column
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildCfgExtraction(data: CfgParseResult): CfgExtractionResult {
  const { header, cstics } = data;

  const valueByCharc = new Map<string, string>();
  for (const c of cstics) {
    if (!c.charc) continue;
    const v = (c.value ?? '').trim();
    if (!v || v === '*') continue;
    if (!valueByCharc.has(c.charc)) valueByCharc.set(c.charc, v);
  }

  const pick = (...keys: string[]): { value: string; key: string } | undefined => {
    for (const k of keys) {
      const v = valueByCharc.get(k);
      if (v) return { value: v, key: k };
    }
    return undefined;
  };
  const getVal = (...keys: string[]): string | undefined => pick(...keys)?.value;

  const ctx: BuildCtx = { header, getVal, pick };

  const crmRow: CrmTemplateRow = {};
  const fieldResults: Record<string, FieldResult> = {};
  const usedCfgKeys = new Map<string, { column: string; status: CfgFieldStatus; note: string }>();

  let mappedCount = 0;
  let mappingRequiredCount = 0;
  let manualCount = 0;

  for (const column of CRM_TEMPLATE_COLUMNS) {
    if (META_COLUMNS.has(column)) continue;
    const compute = FIELD_COMPUTERS[column];
    const result = compute ? compute(ctx) : manualRequired('No mapping rule defined for this field');
    fieldResults[column] = result;
    crmRow[column] = result.value;

    if (result.status === 'Mapped') mappedCount++;
    else if (result.status === 'Mapping Required') mappingRequiredCount++;
    else manualCount++;

    for (const key of result.cfgKeys) {
      if (!usedCfgKeys.has(key)) usedCfgKeys.set(key, { column, status: result.status, note: result.note });
    }
  }

  const hasIssues = mappingRequiredCount > 0 || manualCount > 0;
  crmRow['Raw CFG File Name'] = header.fileName;
  crmRow['Extraction Status'] = mappedCount > 0 ? 'Extracted' : 'Failed';
  crmRow['Manual Review Required'] = hasIssues ? 'Yes' : 'No';
  crmRow['Notes'] = `${mappedCount} field(s) mapped directly, ${mappingRequiredCount} require code mapping, ${manualCount} require manual input.`;

  // Sheet 2: every raw CFG key/value, annotated with whatever structured field consumed it (if any).
  const rawMapping: CfgRawMappingRow[] = cstics.map((c) => {
    const usage = usedCfgKeys.get(c.charc);
    return {
      cfgKey: c.charc,
      cfgValue: c.value,
      mappedField: usage?.column ?? '',
      mappingStatus: usage?.status ?? 'Not Mapped',
      notes: usage?.note ?? 'Not part of the fixed CRM template; kept for reference',
    };
  });

  const summary: CfgExtractionSummary = {
    cfgFileName: header.fileName,
    machineModel: crmRow['Machine Model'] || '',
    totalCfgKeysFound: cstics.length,
    totalFieldsMapped: mappedCount,
    totalFieldsRequiringMapping: mappingRequiredCount,
    totalManualFieldsRequired: manualCount,
    extractionConfidence: `${Math.round((mappedCount / (CRM_TEMPLATE_COLUMNS.length - META_COLUMNS.size)) * 100)}%`,
    overallNotes: hasIssues
      ? 'Some fields need code-dictionary mapping or manual input before this record is offer-ready.'
      : 'All template fields were mapped directly from the CFG.',
  };

  const manualReviewItems: CfgManualReviewItem[] = [];
  for (const column of CRM_TEMPLATE_COLUMNS) {
    if (META_COLUMNS.has(column)) continue;
    const result = fieldResults[column];
    if (result.status === 'Mapped') continue;
    manualReviewItems.push({
      field: column,
      cfgKey: result.cfgKeys[0],
      cfgValue: result.cfgKeys[0] ? getVal(result.cfgKeys[0]) : undefined,
      reason: result.note,
    });
  }
  for (const m of MANUAL_INPUT_FIELDS) {
    manualReviewItems.push({ field: m.fieldName, reason: m.reason });
  }

  const json: CfgExtractionJson = { manual_review_required: manualReviewItems };
  for (const column of CRM_TEMPLATE_COLUMNS) {
    if (META_COLUMNS.has(column)) continue;
    json[snakeCase(column)] = crmRow[column];
  }
  json.extraction_status = crmRow['Extraction Status'];
  json.manual_review_needed = hasIssues;

  return { crmRow, rawMapping, manualFields: MANUAL_INPUT_FIELDS, summary, json };
}
