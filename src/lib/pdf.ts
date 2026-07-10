import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ParsedQuote } from '@/types';

const PRIMARY = [17, 43, 63] as const; // #112b3f
const SECONDARY = [178, 47, 49] as const; // #b22f31
const MUTED = [110, 110, 110] as const;

function fmtMoney(v: number | null) {
  if (v == null) return '—';
  return (
    '€' +
    Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
  );
}

export function downloadQuotePdf(
  quote: ParsedQuote,
  contact: { customer: string; email: string; phone: string; owner: string; stage: string }
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let y = 18;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  }

  // Title
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(quote.title ? 'Equipment Configuration' : 'Quote Record', marginX, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const subtitle = [quote.title, quote.kbVersion ? `Kb ${quote.kbVersion}` : ''].filter(Boolean).join(' · ');
  if (subtitle) {
    doc.text(subtitle, marginX, y);
    y += 6;
  } else {
    y += 2;
  }

  // Nameplate fields
  const fields: [string, string][] = [
    ['Customer Name', contact.customer || '—'],
    ['Contact Email', contact.email || '—'],
    ['Contact Phone', contact.phone || '—'],
    ['Deal Owner', contact.owner || '—'],
    ['Deal Stage', contact.stage],
    ['Material No.', quote.materialNo || '—'],
    ['Quantity', quote.quantity || '—'],
    ['Quote Date', quote.date || '—'],
  ];

  const colWidth = (pageWidth - marginX * 2) / 2;
  doc.setDrawColor(216, 210, 196);
  doc.setFontSize(8.5);
  fields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginX + col * colWidth;
    const fy = y + row * 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, fy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(String(value), x, fy + 4.5);
  });
  y += Math.ceil(fields.length / 2) * 10 + 6;

  // Sections
  for (const section of quote.sections) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PRIMARY);
    doc.text(`${section.name} (${section.items.length})`, marginX, y);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtMoney(section.subtotal), pageWidth - marginX, y, { align: 'right' });
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Code', 'Feature', 'Spec / Value', 'Unit €', 'Total €', 'Cond.']],
      body: section.items.map((it) => [
        it.code.split(' ')[0],
        it.feature,
        `${it.value}${it.description ? '\n' + it.description.slice(0, 140) : ''}`,
        it.unitPriceGross != null ? it.unitPriceGross.toLocaleString() : '—',
        it.totalPriceGross != null ? it.totalPriceGross.toLocaleString() : '—',
        it.conditionType || '',
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.6, valign: 'top', textColor: [40, 40, 40] },
      headStyles: { fillColor: [242, 237, 226], textColor: [110, 100, 80], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 243] },
      columnStyles: {
        0: { cellWidth: 18 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 16 },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Summary
  const summaryRows = quote.summary.filter((s) => s.grossTotal != null || s.netTotal != null);
  if (summaryRows.length) {
    ensureSpace(10 + summaryRows.length * 6 + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...MUTED);
    doc.text('PRICING SUMMARY', marginX, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    summaryRows.forEach((s) => {
      doc.setTextColor(40, 40, 40);
      doc.text(s.label, marginX, y);
      doc.text(fmtMoney(s.grossTotal ?? s.netTotal), pageWidth - marginX, y, { align: 'right' });
      y += 6;
    });

    y += 2;
    doc.setDrawColor(...SECONDARY);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('TOTAL PRICE', marginX, y);
    doc.setTextColor(...SECONDARY);
    doc.setFontSize(14);
    doc.text(fmtMoney(quote.grandTotal), pageWidth - marginX, y, { align: 'right' });
    y += 10;
  }

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(quote.sourceFile || '', marginX, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  const baseName = (contact.customer || quote.sourceFile || 'quote').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  doc.save(`${baseName || 'quote'}.pdf`);
}
