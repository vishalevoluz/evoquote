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
    classType: string;
    objType: string;
    language: string;
  };
  cstics: CfgCstic[];
  conditions: CfgCondition[];
}

/** CFG-to-CRM structured extraction (see src/lib/cfgFieldMapping.ts) */
export type CfgFieldStatus = 'Mapped' | 'Mapping Required' | 'Manual Input Required';

export type CrmTemplateRow = Record<string, string>;

export interface CfgRawMappingRow {
  cfgKey: string;
  cfgValue: string;
  mappedField: string;
  mappingStatus: CfgFieldStatus | 'Not Mapped';
  notes: string;
}

export interface ManualInputFieldRow {
  fieldName: string;
  reason: string;
  requiredForOffer: string;
  exampleValue: string;
}

export interface CfgExtractionSummary {
  cfgFileName: string;
  machineModel: string;
  totalCfgKeysFound: number;
  totalFieldsMapped: number;
  totalFieldsRequiringMapping: number;
  totalManualFieldsRequired: number;
  extractionConfidence: string;
  overallNotes: string;
}

export interface CfgManualReviewItem {
  field: string;
  cfgKey?: string;
  cfgValue?: string;
  reason: string;
}

export interface CfgExtractionJson {
  [key: string]: string | boolean | CfgManualReviewItem[];
  manual_review_required: CfgManualReviewItem[];
}

export interface CfgExtractionResult {
  crmRow: CrmTemplateRow;
  rawMapping: CfgRawMappingRow[];
  manualFields: ManualInputFieldRow[];
  summary: CfgExtractionSummary;
  json: CfgExtractionJson;
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  currency: 'EUR' | 'USD' | 'GBP';
  notes: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  oib: string;
  phone: string;
  fax: string;
  email: string;
  iban: string;
  bankName: string;
}

export interface CustomerAddress {
  street: string;
  postalCode: string;
  city: string;
  oib: string;
}

export interface OfferMeta {
  offerNumber: string;
  offerDate: string;
  validUntil: string;
  place: string;
}

export type TechSpecLanguage = 'en' | 'hr';

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
