import * as XLSX from 'xlsx';
import type { CfgExtractionResult } from '@/types';
import { CRM_TEMPLATE_COLUMNS } from '@/lib/cfgFieldMapping';

function autoWidth(rows: (string | number)[][]): { wch: number }[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      widths[i] = Math.min(Math.max(widths[i] ?? 10, len + 2), 60);
    });
  }
  return widths.map((w) => ({ wch: w }));
}

/** Builds the 4-sheet CRM import workbook described in the CFG extraction spec. */
export function buildCfgExtractionWorkbook(result: CfgExtractionResult): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const crmHeader = [...CRM_TEMPLATE_COLUMNS];
  const crmRows = [crmHeader, crmHeader.map((c) => result.crmRow[c] ?? '')];
  const wsCrm = XLSX.utils.aoa_to_sheet(crmRows);
  wsCrm['!cols'] = autoWidth(crmRows);
  XLSX.utils.book_append_sheet(wb, wsCrm, 'CRM Import Template');

  const rawHeader = ['CFG Key', 'CFG Value', 'Mapped Field', 'Mapping Status', 'Notes'];
  const rawRows = [
    rawHeader,
    ...result.rawMapping.map((r) => [r.cfgKey, r.cfgValue, r.mappedField, r.mappingStatus, r.notes]),
  ];
  const wsRaw = XLSX.utils.aoa_to_sheet(rawRows);
  wsRaw['!cols'] = autoWidth(rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw CFG Mapping');

  const manualHeader = ['Field Name', 'Reason', 'Required For Offer', 'Example Value'];
  const manualRows = [
    manualHeader,
    ...result.manualFields.map((m) => [m.fieldName, m.reason, m.requiredForOffer, m.exampleValue]),
  ];
  const wsManual = XLSX.utils.aoa_to_sheet(manualRows);
  wsManual['!cols'] = autoWidth(manualRows);
  XLSX.utils.book_append_sheet(wb, wsManual, 'Manual Input Required');

  const s = result.summary;
  const summaryRows = [
    ['Field', 'Value'],
    ['CFG File Name', s.cfgFileName],
    ['Machine Model', s.machineModel],
    ['Total CFG Keys Found', s.totalCfgKeysFound],
    ['Total Fields Mapped', s.totalFieldsMapped],
    ['Total Fields Requiring Mapping', s.totalFieldsRequiringMapping],
    ['Total Manual Fields Required', s.totalManualFieldsRequired],
    ['Extraction Confidence', s.extractionConfidence],
    ['Overall Notes', s.overallNotes],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = autoWidth(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Extraction Summary');

  return wb;
}

export function downloadCfgExtractionExcel(result: CfgExtractionResult, baseFileName: string) {
  const wb = buildCfgExtractionWorkbook(result);
  XLSX.writeFile(wb, `${baseFileName}_CRM_Import.xlsx`);
}

export function downloadCfgExtractionJson(result: CfgExtractionResult, baseFileName: string) {
  const blob = new Blob([JSON.stringify(result.json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseFileName}_extraction.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
