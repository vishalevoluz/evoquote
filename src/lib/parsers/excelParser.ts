import * as XLSX from 'xlsx';
import type { ExcelParseResult, ParsedQuote, QuoteSection, QuoteSummaryRow, RawSheet } from '@/types';

function isNum(v: unknown): v is number {
  return typeof v === 'number';
}

/**
 * Parses a single "calculation sheet" style grid (as used in STILL / similar
 * SAP-variant-config quote exports) into a structured quote object.
 *
 * Layout assumptions (see project notes):
 *  - col A: item code            - col F: unit price gross
 *  - col B: section header text  - col G: unit price net
 *  - col C: feature / label      - col H: total price net
 *  - col D: value / spec         - col J: total price gross
 *  - col E: description          - col K: condition type
 */
function parseStructuredQuote(rows: (string | number | null)[][], sourceFile: string): ParsedQuote {
  let title = '';
  let date = '';
  let kbVersion = '';
  let customer = '';
  let quantity = '';
  let materialNo = '';

  let sections: QuoteSection[] = [];
  const summary: QuoteSummaryRow[] = [];
  let currentSection: QuoteSection | null = null;
  let grandTotal: number | null = null;

  for (const r of rows) {
    const c0 = r[0], c1 = r[1], c2 = r[2], c3 = r[3], c4 = r[4];
    const c5 = r[5], c6 = r[6], c7 = r[7], c9 = r[9], c10 = r[10];

    if (typeof c2 === 'string' && /calculation sheet of/i.test(c2)) {
      title = c2;
      const dm = c2.match(/calculation sheet of\s*([\d.\/\-]+)/i);
      if (dm) date = dm[1];
      const km = c2.match(/KbName\/Version:\s*([^\s]+)/i);
      if (km) kbVersion = km[1];
      continue;
    }
    if (typeof c1 === 'string' && /^customer:/i.test(c1)) {
      customer = (c2 ?? '').toString().trim();
      continue;
    }
    if (typeof c1 === 'string' && /^quantity:/i.test(c1)) {
      const qm = c1.match(/quantity:\s*(.+)/i);
      if (qm) quantity = qm[1].trim();
      if (typeof c2 === 'string') {
        const mm = c2.match(/material no\.?:\s*(.+)/i);
        if (mm) materialNo = mm[1].trim();
      }
      continue;
    }

    const hasCode = typeof c0 === 'string' && c0.trim() !== '';
    const hasPrice = isNum(c5) || isNum(c6) || isNum(c7) || isNum(c9);
    const labelCol = typeof c2 === 'string' && c2.trim() !== '' ? c2.trim() : null;
    const sectionNameCol = typeof c1 === 'string' && c1.trim() !== '' ? c1.trim() : null;

    if (!hasCode && sectionNameCol && !hasPrice && sectionNameCol.toLowerCase() !== 'type') {
      currentSection = { name: sectionNameCol, items: [], subtotal: 0 };
      sections.push(currentSection);
      continue;
    }

    if (hasCode) {
      if (!currentSection) {
        currentSection = { name: 'Basic device', items: [], subtotal: 0 };
        sections.push(currentSection);
      }
      currentSection.items.push({
        code: String(c0),
        feature: labelCol || '',
        value: c3 != null ? String(c3) : '',
        description: c4 != null ? String(c4) : '',
        unitPriceGross: isNum(c5) ? c5 : null,
        unitPriceNet: isNum(c6) ? c6 : null,
        totalPriceNet: isNum(c7) ? c7 : null,
        totalPriceGross: isNum(c9) ? c9 : null,
        conditionType: (c10 as string) || '',
      });
      continue;
    }

    if (!hasCode && hasPrice && labelCol) {
      const row: QuoteSummaryRow = {
        label: labelCol,
        netTotal: isNum(c7) ? c7 : isNum(c5) ? c5 : null,
        grossTotal: isNum(c9) ? c9 : null,
        condition: (c10 as string) || '',
      };
      summary.push(row);
      if (/total price for all items/i.test(labelCol) && isNum(c9)) {
        grandTotal = c9;
      }
      continue;
    }
  }

  if (grandTotal == null) {
    const cand = summary.filter((s) => /total.*net/i.test(s.label) && s.grossTotal != null);
    if (cand.length) grandTotal = cand[cand.length - 1].grossTotal;
  }

  sections = sections.filter((s) => s.items.length > 0);
  sections.forEach((s) => {
    s.subtotal = s.items.reduce((sum, it) => sum + (it.totalPriceGross || 0), 0);
  });

  return { title, date, kbVersion, customer, quantity, materialNo, sections, summary, grandTotal, sourceFile };
}

export function parseExcelFile(buffer: ArrayBuffer, fileName: string): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheets: RawSheet[] = wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }) as (
      | string
      | number
      | null
    )[][],
  }));

  // Prefer a sheet that looks like the main calculation sheet for structured parsing.
  const structuredSheetName =
    wb.SheetNames.find((n) => /kalk/i.test(n) && !/word/i.test(n)) || wb.SheetNames[0] || null;

  let structured: ParsedQuote | null = null;
  if (structuredSheetName) {
    const target = sheets.find((s) => s.name === structuredSheetName);
    if (target) {
      structured = parseStructuredQuote(target.rows, fileName);
    }
  }

  return { sheets, structured, structuredSheetName };
}
