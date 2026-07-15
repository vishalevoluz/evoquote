import { jsPDF } from 'jspdf';
import type { CfgExtractionResult, CfgParseResult, CompanyInfo, CustomerAddress, OfferMeta, ParsedQuote, TechSpecLanguage } from '@/types';
import { buildCfgExtraction } from '@/lib/cfgFieldMapping';

const INK = [40, 40, 40] as const;
const MUTED = [90, 90, 90] as const;

const LOGO_URL = 'https://autokuca.hr/wp-content/uploads/2022/05/akglogo.png';

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'AUTOKUĆA GAŠPARIĆ d.o.o.',
  address: 'DR. TOME BRATKOVIĆA 1',
  postalCode: '40000',
  city: 'Čakovec',
  oib: '42211007051',
  phone: '040/384-140',
  fax: '040/386-061',
  email: 'info@autokuca.hr',
  iban: 'HR3124020061100028843',
  bankName: 'Erste&Steiermarkische Bank d.d',
};

/**
 * Exact CHARC-code lookup for the Technical Specification section. Codes match
 * the "code" cell of the Kalk-sheet Excel (e.g. "SC_WIDTH 1296.0" -> "SC_WIDTH"),
 * which is what excelParser.ts already exposes as QuoteLineItem.code. Fields with
 * code: null have no corresponding row anywhere in the source data (no SAP/ISO
 * classification, no explicit count, etc.) and always render as "-" rather than
 * a guessed value.
 */
interface TechSpecField {
  code: string | null;
  en: string;
  hr: string;
  source?: 'value' | 'description';
  /** Column name in the CFG CRM extraction template (src/lib/cfgFieldMapping.ts), used when the offer is generated straight from a .cfg upload instead of an Excel calc-sheet. */
  crmColumn?: string;
}

const LEFT_FIELDS: TechSpecField[] = [
  { code: null, en: 'Vehicle Class', hr: 'Klasa viličara', crmColumn: 'Machine Class' },
  { code: null, en: 'Drive Type', hr: 'Pogon', crmColumn: 'Drive Type' },
  { code: 'SC_563700_1_01', en: 'Model', hr: 'Model', crmColumn: 'Machine Model' },
  { code: 'SC_CAPACITY', en: 'Capacity', hr: 'Nosivost (kg)', crmColumn: 'Load Capacity' },
  { code: 'SC_563700_1_LSP', en: 'Load Center', hr: 'Centra težišta tereta', source: 'description', crmColumn: 'Load Centre' },
  { code: null, en: 'Production Year', hr: 'Godina proizvodnje', crmColumn: 'Year of Manufacture' },
  { code: null, en: 'Forklift Type', hr: 'Izvedba viličara' },
  { code: 'SC_WIDTH', en: 'Width', hr: 'Širina viličara', crmColumn: 'Truck Width' },
  { code: 'SC_563700_1_10', en: 'Drive Wheel', hr: 'Pogonski kotač', source: 'description' },
  { code: 'SC_563700_1_09', en: 'Load Wheels', hr: 'Utovarni kotači', source: 'description' },
  { code: null, en: 'Wheel Count', hr: 'Broj kotača', crmColumn: 'Number of Wheels' },
  { code: 'SC_563700_1_02', en: 'Mast', hr: 'Kran', crmColumn: 'Mast Available' },
  { code: 'SC_563700_1_02', en: 'Mast Type', hr: 'Izvedba krana', source: 'description', crmColumn: 'Mast Type' },
  { code: 'SC_563700_1_02_HOE', en: 'Lowered Mast Height', hr: 'Visina spuš.krana(mm)', crmColumn: 'Lowered Mast Height' },
  { code: 'SC_563700_1_02_NHU', en: 'Lift Height', hr: 'Visina dizanja (mm)', crmColumn: 'Lift Height' },
  { code: 'SC_TECHDATA_1_H2', en: 'Free Lift', hr: 'Slob.visina dizanja (mm)', crmColumn: 'Free Lift Height' },
  { code: 'SC_563700_1_02_QBN', en: 'Capacity at Maximum Height', hr: 'Nosivost na max.visini (kg)', crmColumn: 'Capacity at Max Height' },
  { code: 'SC_563700_1_04', en: 'Side Shift', hr: 'Bočni pomak', crmColumn: 'Side Shift' },
  { code: 'SC_563700_1_07', en: 'Fork Length', hr: 'Dužina vilica', crmColumn: 'Fork Length' },
  { code: 'SC_563700_1_14', en: 'Additional Hydraulics', hr: 'Dodatna hidraulika', crmColumn: 'Additional Hydraulics' },
  { code: 'SC_563700_1_1A', en: 'Driver Cabin', hr: 'Prostor za vozača', source: 'description', crmColumn: 'Driver Cabin / Driver Space' },
];

const RIGHT_FIELDS: TechSpecField[] = [
  { code: 'SC_563700_1_1H', en: 'Cabin Heating', hr: 'Grijanje kabine', crmColumn: 'Cabin Heating' },
  { code: 'SC_563700_1_23', en: 'Hydraulic Controls', hr: 'Upravljanje hidraulikom', source: 'description', crmColumn: 'Hydraulic Control Type' },
  { code: 'SC_563700_1_24', en: 'Driving Controls', hr: 'Upravljanje pogonom', source: 'description', crmColumn: 'Drive Control Type' },
  { code: 'SC_563700_1_30', en: 'Parking Brake', hr: 'Ručna kočnica', crmColumn: 'Parking Brake' },
  { code: 'SC_563700_1_1O', en: 'Mirror', hr: 'Unutarnji retrovizor', source: 'description', crmColumn: 'Rear View Mirror' },
  { code: 'SC_563700_1_8Z', en: 'Safety System', hr: 'Sigurnosni sistem', source: 'description', crmColumn: 'Safety System' },
  { code: 'SC_563700_1_8X', en: 'Reverse Alarm', hr: 'Zvučni signal za vožnju unatrag', crmColumn: 'Reverse Sound Signal' },
  { code: 'SC_563700_1_47', en: 'Warning Light', hr: 'Upozoravajuće svjetlo', crmColumn: 'Warning Light' },
  { code: 'SC_563700_1_51', en: 'Front Work Lights', hr: 'Prednji radni farovi', source: 'description', crmColumn: 'Front Working Lights' },
  { code: 'SC_563700_1_49', en: 'Rear Work Lights', hr: 'Zadnji radni farovi', source: 'description', crmColumn: 'Rear Working Lights' },
  { code: 'SC_563700_1_8O', en: 'Operator Assistance', hr: 'Sustav pomoći operateru', source: 'description', crmColumn: 'Operator Assistance System' },
  { code: 'SC_563700_1_70', en: 'Color', hr: 'Boja', crmColumn: 'Colour' },
  { code: 'SC_563700_1_72', en: 'Labels & Instructions', hr: 'Oznake i uputstva', crmColumn: 'Language / Markings' },
  { code: 'SC_563700_1_54', en: 'Battery Compartment', hr: 'Prostor za bateriju', source: 'description', crmColumn: 'Battery Compartment' },
  { code: 'SC_BA_SERVICETYPE', en: 'Battery Type', hr: 'Vrsta baterije', crmColumn: 'Battery Type' },
  { code: null, en: 'Battery Voltage', hr: 'Nazivni napon baterije', crmColumn: 'Battery Voltage' },
  { code: null, en: 'Battery Capacity', hr: 'Kapacitet baterije', crmColumn: 'Battery Capacity' },
  { code: 'SCX_BA_QUAN', en: 'Battery Count', hr: 'Broj baterija', crmColumn: 'Number of Batteries' },
  { code: 'SC_563700_1_53', en: 'Battery Display', hr: 'Zasebni display za prikaz stanja i kapaciteta baterije', crmColumn: 'Battery Display' },
  { code: 'SC_509780_2_03', en: 'Water Filling System', hr: 'Sustav za centralno nadoljevanje vode', crmColumn: 'Central Water Filling System' },
  { code: 'SC_509880_3_01', en: 'Charger', hr: 'Adekvatan punjač', crmColumn: 'Charger Available' },
  { code: 'SC_509880_3_02', en: 'Charging Time', hr: 'Vrijeme punjenja', crmColumn: 'Charging Time' },
  { code: 'SC_XXXXXX_4_ATT', en: 'Additional Equipment', hr: 'DODATAK' },
  { code: null, en: 'Manufacturer', hr: 'Proizvođač', crmColumn: 'Manufacturer' },
];

function resolveTechSpecValue(quote: ParsedQuote, field: TechSpecField): string | null {
  if (!field.code) return null;
  for (const section of quote.sections) {
    for (const item of section.items) {
      if (item.code.split(' ')[0] !== field.code) continue;
      const primary = field.source === 'description' ? item.description : item.value;
      const value = (primary || item.value || item.description || '').trim();
      return value || null;
    }
  }
  return null;
}

/**
 * Resolves tech-spec values for a .cfg-sourced offer from the verified CRM field
 * extraction (src/lib/cfgFieldMapping.ts) instead of resolveTechSpecValue's SC_*
 * code lookup, which only matches Excel calc-sheet rows (raw .cfg CSTICs carry
 * SAP codes, not the resolved descriptions the Excel export contains).
 */
function resolveCfgTechSpecValue(extraction: CfgExtractionResult, field: TechSpecField): string | null {
  if (field.hr === 'Dužina vilica') {
    const length = extraction.crmRow['Fork Length'];
    const dimension = extraction.crmRow['Fork Dimension'];
    if (!length && !dimension) return null;
    return [length, dimension].filter(Boolean).join(' / ');
  }
  if (field.en === 'Additional Equipment') {
    const voltage = extraction.crmRow['Charger Voltage'];
    const current = extraction.crmRow['Charger Current'];
    if (!voltage && !current) return null;
    return `${voltage ? voltage + 'V' : ''}${voltage && current ? '/' : ''}${current ? current + 'A' : ''}`;
  }
  if (!field.crmColumn) return null;
  const value = extraction.crmRow[field.crmColumn];
  if (!value) return null;
  const row = extraction.rawMapping.find((r) => r.mappedField === field.crmColumn);
  if (row?.mappingStatus === 'Mapping Required') {
    return `${value} (šifra – potrebno mapiranje / code needs mapping)`;
  }
  return value;
}

let logoPromise: Promise<{ dataUrl: string; ratio: number } | null> | null = null;

/** Best-effort logo fetch; resolves null (never rejects) so a CORS/network failure never breaks PDF generation. */
function loadLogo(): Promise<{ dataUrl: string; ratio: number } | null> {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
  return logoPromise;
}

async function drawHeader(
  doc: jsPDF,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const right = pageWidth - marginX;
  const y = 16;

  const logo = await loadLogo();
  if (logo) {
    const w = 28;
    const h = w / logo.ratio;
    doc.addImage(logo.dataUrl, 'PNG', marginX, y, w, h);
  }

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  const name = company.name || '-';
  doc.text(name, right, y + 3, { align: 'right' });
  const nameWidth = doc.getTextWidth(name);
  doc.setLineWidth(0.3);
  doc.line(right - nameWidth, y + 3.8, right, y + 3.8);

  let cy = y + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(company.address || '-', right, cy, { align: 'right' });
  cy += 4;
  doc.text(`${company.postalCode || ''} ${company.city || ''}`.trim() || '-', right, cy, { align: 'right' });
  cy += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  [
    `OIB: ${company.oib || '-'}`,
    `Tel: ${company.phone || '-'}`,
    `Fax: ${company.fax || '-'}`,
    `e-mail: ${company.email || '-'}`,
  ].forEach((line) => {
    doc.text(line, right, cy, { align: 'right' });
    cy += 3.8;
  });
  cy += 2;

  doc.setFont('helvetica', 'bolditalic');
  const ibanLine = `IBAN: ${company.iban || '-'}`;
  doc.text(ibanLine, right, cy, { align: 'right' });
  const ibanWidth = doc.getTextWidth(ibanLine);
  doc.line(right - ibanWidth, cy + 0.8, right, cy + 0.8);
  cy += 4;
  doc.setFont('helvetica', 'italic');
  doc.text(company.bankName || '-', right, cy, { align: 'right' });
  cy += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  [
    `Mjesto: ${offer.place || '-'}`,
    `Datum ponude: ${offer.offerDate || '-'}`,
    `Vrijedi do: ${offer.validUntil || '-'}`,
  ].forEach((line) => {
    doc.text(line, right, cy, { align: 'right' });
    cy += 4;
  });

  const boxX = marginX;
  const boxY = y + 20;
  const boxWidth = 85;
  const innerWidth = boxWidth - 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const nameLines = doc.splitTextToSize(customerName || '-', innerWidth);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const streetLines = doc.splitTextToSize(customerAddress.street || '-', innerWidth);
  const cityLine = `${customerAddress.postalCode || ''} ${customerAddress.city || ''}`.trim() || '-';
  const cityLines = doc.splitTextToSize(cityLine, innerWidth);

  const lineH = 4.3;
  const boxHeight = 6 + nameLines.length * 4.6 + streetLines.length * lineH + cityLines.length * lineH;

  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2);

  let by = boxY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(nameLines, boxX + 4, by);
  by += nameLines.length * 4.6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(streetLines, boxX + 4, by);
  by += streetLines.length * lineH;
  doc.text(cityLines, boxX + 4, by);

  let afterBoxY = boxY + boxHeight + 6;
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(`OIB: ${customerAddress.oib || '-'}`, boxX, afterBoxY);
  afterBoxY += 6;

  let titleY = Math.max(cy, afterBoxY) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`Ponuda za NOVI VILIČAR broj ${offer.offerNumber || '-'}`, pageWidth / 2, titleY, { align: 'center' });
  titleY += 8;

  return titleY;
}

type TechSpecResolver = (field: TechSpecField) => string | null;

function drawColumn(
  doc: jsPDF,
  fields: TechSpecField[],
  resolve: TechSpecResolver,
  lang: TechSpecLanguage,
  x: number,
  startY: number,
  labelWidth: number,
  valueWidth: number
): number {
  let cy = startY;
  const lineH = 3.6;
  doc.setFontSize(7.8);
  for (const field of fields) {
    const value = resolve(field) || '-';
    const label = `${lang === 'hr' ? field.hr : field.en}:`;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    const labelLines = doc.splitTextToSize(label, labelWidth - 2);
    doc.text(labelLines, x, cy);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const valueLines = doc.splitTextToSize(value, valueWidth);
    doc.text(valueLines, x + labelWidth, cy);

    cy += Math.max(labelLines.length, valueLines.length) * lineH + 1.4;
  }
  return cy;
}

function drawTechSpec(doc: jsPDF, y: number, resolve: TechSpecResolver, lang: TechSpecLanguage): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const title = lang === 'hr' ? 'Tehnička specifikacija:' : 'Technical Specification:';
  doc.text(title, marginX, y);
  doc.setLineWidth(0.3);
  doc.line(marginX, y + 1, marginX + doc.getTextWidth(title), y + 1);
  y += 6;

  const colGap = 6;
  const colWidth = (pageWidth - marginX * 2 - colGap) / 2;
  const labelWidth = 42;
  const valueWidth = colWidth - labelWidth - 2;

  const leftEndY = drawColumn(doc, LEFT_FIELDS, resolve, lang, marginX, y, labelWidth, valueWidth);
  const rightEndY = drawColumn(doc, RIGHT_FIELDS, resolve, lang, marginX + colWidth + colGap, y, labelWidth, valueWidth);

  return Math.max(leftEndY, rightEndY) + 4;
}

async function buildOfferDocCore(
  resolve: TechSpecResolver,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const y = await drawHeader(doc, company, customerName, customerAddress, offer);
  drawTechSpec(doc, y, resolve, techSpecLanguage);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Ponuda: ${offer.offerNumber || ''}`, marginX, pageHeight - 8);
    doc.text(`Strana: ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

function offerFileName(offer: OfferMeta, customerName: string) {
  const baseName = (offer.offerNumber || customerName || 'ponuda').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  return `ponuda_${baseName || 'ponuda'}.pdf`;
}

export async function buildOfferDoc(
  quote: ParsedQuote,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
): Promise<jsPDF> {
  return buildOfferDocCore(
    (field) => resolveTechSpecValue(quote, field),
    company,
    customerName,
    customerAddress,
    offer,
    techSpecLanguage
  );
}

export async function downloadOfferPdf(
  quote: ParsedQuote,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
) {
  const doc = await buildOfferDoc(quote, company, customerName, customerAddress, offer, techSpecLanguage);
  doc.save(offerFileName(offer, customerName));
}

export async function previewOfferPdf(
  quote: ParsedQuote,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
) {
  const doc = await buildOfferDoc(quote, company, customerName, customerAddress, offer, techSpecLanguage);
  window.open(doc.output('bloburl') as unknown as string, '_blank');
}

/** Same offer layout, but tech-spec values are sourced from a .cfg upload's verified CRM extraction. */
export async function buildOfferDocFromCfg(
  cfgData: CfgParseResult,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
): Promise<jsPDF> {
  const extraction = buildCfgExtraction(cfgData);
  return buildOfferDocCore(
    (field) => resolveCfgTechSpecValue(extraction, field),
    company,
    customerName,
    customerAddress,
    offer,
    techSpecLanguage
  );
}

export async function downloadOfferPdfFromCfg(
  cfgData: CfgParseResult,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
) {
  const doc = await buildOfferDocFromCfg(cfgData, company, customerName, customerAddress, offer, techSpecLanguage);
  doc.save(offerFileName(offer, customerName));
}

export async function previewOfferPdfFromCfg(
  cfgData: CfgParseResult,
  company: CompanyInfo,
  customerName: string,
  customerAddress: CustomerAddress,
  offer: OfferMeta,
  techSpecLanguage: TechSpecLanguage
) {
  const doc = await buildOfferDocFromCfg(cfgData, company, customerName, customerAddress, offer, techSpecLanguage);
  window.open(doc.output('bloburl') as unknown as string, '_blank');
}
