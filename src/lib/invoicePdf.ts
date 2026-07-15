import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceMeta, ParsedQuote } from '@/types';

const PRIMARY = [17, 43, 63] as const; // #112b3f
const SECONDARY = [178, 47, 49] as const; // #b22f31
const MUTED = [110, 110, 110] as const;
const INK = [40, 40, 40] as const;

const CURRENCY_SYMBOL: Record<InvoiceMeta['currency'], string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

function fmtMoney(v: number | null, currency: InvoiceMeta['currency']) {
  if (v == null) return '—';
  return CURRENCY_SYMBOL[currency] + Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Flattens every section's line items into one continuous invoice table, in order. */
function flattenLineItems(quote: ParsedQuote) {
  return quote.sections.flatMap((section) =>
    section.items.map((item) => ({ section: section.name, ...item }))
  );
}

/** Computed subtotal from line items, used when the parsed summary doesn't carry one. */
function computeSubtotal(quote: ParsedQuote) {
  return quote.sections.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + (it.totalPriceGross || 0), 0), 0);
}

function buildInvoiceDoc(
  quote: ParsedQuote,
  contact: { customer: string; email: string; phone: string },
  invoice: InvoiceMeta
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let y = 18;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  }

  // Header: company name (left) + INVOICE title & meta (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...PRIMARY);
  doc.text('AutoKuca', marginX, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Equipment Quotes & Configuration', marginX, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...SECONDARY);
  doc.text('INVOICE', pageWidth - marginX, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const metaLines = [
    `Invoice No.  ${invoice.invoiceNumber || '—'}`,
    `Invoice Date  ${invoice.invoiceDate || '—'}`,
    `Due Date  ${invoice.dueDate || '—'}`,
  ];
  metaLines.forEach((line, i) => {
    doc.text(line, pageWidth - marginX, y + 6 + i * 4.5, { align: 'right' });
  });

  y += 22;
  doc.setDrawColor(...SECONDARY);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // Bill To / Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('BILL TO', marginX, y);
  doc.text('PAYMENT TERMS', pageWidth / 2 + 6, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const billTo = [contact.customer || '—', contact.email, contact.phone].filter(Boolean);
  billTo.forEach((line, i) => doc.text(line, marginX, y + i * 5));
  doc.text(invoice.paymentTerms || '—', pageWidth / 2 + 6, y);

  y += Math.max(billTo.length, 1) * 5 + 8;

  // Product table
  const lineItems = flattenLineItems(quote);
  ensureSpace(20);
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Code', 'Description', 'Qty', `Unit ${CURRENCY_SYMBOL[invoice.currency]}`, `Total ${CURRENCY_SYMBOL[invoice.currency]}`, 'Cond.']],
    body: lineItems.length
      ? lineItems.map((it) => [
          it.code.split(' ')[0],
          `${it.feature}${it.value ? ' — ' + it.value : ''}`,
          quote.quantity || '1',
          it.unitPriceGross != null ? it.unitPriceGross.toLocaleString() : '—',
          it.totalPriceGross != null ? it.totalPriceGross.toLocaleString() : '—',
          it.conditionType || '',
        ])
      : [['—', 'No line items', '', '', '', '']],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top', textColor: [...INK] },
    headStyles: { fillColor: [...PRIMARY], textColor: [250, 248, 243], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 245, 240] },
    columnStyles: {
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 18 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const subtotal = computeSubtotal(quote);
  const adjustmentRows = quote.summary.filter(
    (s) => (s.grossTotal != null || s.netTotal != null) && !/total price for all items/i.test(s.label)
  );

  ensureSpace(10 + adjustmentRows.length * 6 + 20);
  const totalsX = pageWidth - marginX;
  const totalsLabelX = pageWidth - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text('Subtotal', totalsLabelX, y);
  doc.text(fmtMoney(subtotal, invoice.currency), totalsX, y, { align: 'right' });
  y += 6;

  adjustmentRows.forEach((s) => {
    doc.setTextColor(...MUTED);
    doc.text(s.label, totalsLabelX, y);
    doc.setTextColor(...INK);
    doc.text(fmtMoney(s.grossTotal ?? s.netTotal, invoice.currency), totalsX, y, { align: 'right' });
    y += 6;
  });

  y += 2;
  doc.setDrawColor(...SECONDARY);
  doc.setLineWidth(0.6);
  doc.line(totalsLabelX - 4, y, totalsX, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text('GRAND TOTAL', totalsLabelX, y);
  doc.setTextColor(...SECONDARY);
  doc.setFontSize(14);
  doc.text(fmtMoney(quote.grandTotal ?? subtotal, invoice.currency), totalsX, y, { align: 'right' });
  y += 12;

  // Notes
  if (invoice.notes) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('NOTES', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(invoice.notes, pageWidth - marginX * 2);
    doc.text(wrapped, marginX, y);
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Invoice ${invoice.invoiceNumber || ''}`, marginX, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

function invoiceFileName(quote: ParsedQuote, contact: { customer: string }, invoice: InvoiceMeta) {
  const baseName = (invoice.invoiceNumber || contact.customer || quote.sourceFile || 'invoice')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return `invoice_${baseName || 'invoice'}.pdf`;
}

export function downloadInvoicePdf(
  quote: ParsedQuote,
  contact: { customer: string; email: string; phone: string },
  invoice: InvoiceMeta
) {
  const doc = buildInvoiceDoc(quote, contact, invoice);
  doc.save(invoiceFileName(quote, contact, invoice));
}

/** Opens the rendered invoice in a new browser tab for review, without downloading it. */
export function previewInvoicePdf(
  quote: ParsedQuote,
  contact: { customer: string; email: string; phone: string },
  invoice: InvoiceMeta
) {
  const doc = buildInvoiceDoc(quote, contact, invoice);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl as unknown as string, '_blank');
}
