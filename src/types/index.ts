export interface QuoteLineItem {
  code: string;
  feature: string;
  value: string;
  description: string;
  unitPriceGross: number | null;
  unitPriceNet: number | null;
  totalPriceNet: number | null;
  totalPriceGross: number | null;
  conditionType: string;
}

export interface QuoteSection {
  name: string;
  items: QuoteLineItem[];
  subtotal: number;
}

export interface QuoteSummaryRow {
  label: string;
  netTotal: number | null;
  grossTotal: number | null;
  condition: string;
}

export interface ParsedQuote {
  title: string;
  date: string;
  kbVersion: string;
  customer: string;
  quantity: string;
  materialNo: string;
  sections: QuoteSection[];
  summary: QuoteSummaryRow[];
  grandTotal: number | null;
  sourceFile: string;
}

export interface RawSheet {
  name: string;
  rows: (string | number | null)[][];
}

export interface ExcelParseResult {
  sheets: RawSheet[];
  structured: ParsedQuote | null;
  structuredSheetName: string | null;
}

export interface CfgCstic {
  charc: string;
  value: string;
  author: string;
  invisible: string;
}

export interface CfgCondition {
  type: string;
  name: string;
  pricingUnit: string;
  pricingValue: string;
  rateUnit: string;
  rateValue: string;
}

export interface CfgParseResult {
  header: {
    fileName: string;
    kbName: string;
    kbVersion: string;
    kbBuild: string;
    kbProfile: string;
    materialNo: string;
    qty: string;
    unit: string;
  };
  cstics: CfgCstic[];
  conditions: CfgCondition[];
}

export interface CrmRecordInput {
  sessionId: string;
  sourceFile: string;
  customer: string;
  email: string;
  phone: string;
  owner: string;
  stage: 'new' | 'quoted' | 'won' | 'lost';
  materialNo: string;
  quantity: string;
  grandTotal: number | null;
  sections: QuoteSection[];
  summary: QuoteSummaryRow[];
}
