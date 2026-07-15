'use client';

import { useMemo, useState } from 'react';
import type { CfgParseResult, CompanyInfo, InvoiceMeta, TechSpecLanguage } from '@/types';
import { cfgToParsedQuote } from '@/lib/parsers/cfgParser';
import { downloadInvoicePdf, previewInvoicePdf } from '@/lib/invoicePdf';
import { DEFAULT_COMPANY_INFO, downloadOfferPdfFromCfg, previewOfferPdfFromCfg } from '@/lib/offerPdf';
import { buildCfgExtraction, CRM_TEMPLATE_COLUMNS } from '@/lib/cfgFieldMapping';
import { downloadCfgExtractionExcel, downloadCfgExtractionJson } from '@/lib/cfgExcelExport';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toCsvValue(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCsv(rows: string[][], header: string[], filename: string) {
  const lines = [header, ...rows].map((r) => r.map(toCsvValue).join(','));
  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CfgView({ data }: { data: CfgParseResult }) {
  const { header, cstics, conditions } = data;
  const baseName = header.fileName.replace(/\.[^.]+$/, '');

  const [customer, setCustomer] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDaysIso(30));
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [currency, setCurrency] = useState<InvoiceMeta['currency']>('EUR');
  const [notes, setNotes] = useState('');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerPostalCode, setCustomerPostalCode] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerOib, setCustomerOib] = useState('');
  const [place, setPlace] = useState(DEFAULT_COMPANY_INFO.city);
  const [validUntil, setValidUntil] = useState(plusDaysIso(15));
  const [techSpecLanguage, setTechSpecLanguage] = useState<TechSpecLanguage>('hr');
  const [offerBusy, setOfferBusy] = useState(false);

  const extraction = useMemo(() => buildCfgExtraction(data), [data]);

  function updateCompany<K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) {
    setCompany((c) => ({ ...c, [key]: value }));
  }

  function validateInvoiceInputs(): boolean {
    if (!customer.trim()) {
      setInvoiceError('Enter a customer name before generating an invoice.');
      return false;
    }
    if (!invoiceNumber.trim()) {
      setInvoiceError('Enter an invoice number before generating an invoice.');
      return false;
    }
    setInvoiceError(null);
    return true;
  }

  function invoiceArgs() {
    const quote = cfgToParsedQuote(data);
    return [
      quote,
      { customer, email, phone },
      { invoiceNumber, invoiceDate, dueDate, paymentTerms, currency, notes },
    ] as const;
  }

  function handlePreviewInvoicePdf() {
    if (!validateInvoiceInputs()) return;
    previewInvoicePdf(...invoiceArgs());
  }

  function handleDownloadInvoicePdf() {
    if (!validateInvoiceInputs()) return;
    downloadInvoicePdf(...invoiceArgs());
  }

  function validateOfferInputs(): boolean {
    if (!customer.trim()) {
      setInvoiceError('Enter a customer name before generating an offer.');
      return false;
    }
    if (!invoiceNumber.trim()) {
      setInvoiceError('Enter an offer number before generating an offer.');
      return false;
    }
    setInvoiceError(null);
    return true;
  }

  function offerArgs() {
    return [
      data,
      company,
      customer,
      { street: customerStreet, postalCode: customerPostalCode, city: customerCity, oib: customerOib },
      { offerNumber: invoiceNumber, offerDate: invoiceDate, validUntil, place },
      techSpecLanguage,
    ] as const;
  }

  async function handlePreviewOfferPdf() {
    if (!validateOfferInputs()) return;
    setOfferBusy(true);
    try {
      await previewOfferPdfFromCfg(...offerArgs());
    } finally {
      setOfferBusy(false);
    }
  }

  async function handleDownloadOfferPdf() {
    if (!validateOfferInputs()) return;
    setOfferBusy(true);
    try {
      await downloadOfferPdfFromCfg(...offerArgs());
    } finally {
      setOfferBusy(false);
    }
  }

  return (
    <div>
      <div className="bg-gradient-to-b from-[#f2eee4] to-[#eeeae1] border border-[#d8d2c4] rounded-lg p-4 mb-4">
        <h3 className="font-mono text-sm mb-2 text-[#2a2724]">{header.fileName}</h3>
        <div className="grid grid-cols-4 gap-3 text-xs">
          <Info label="Material No." value={header.materialNo} />
          <Info label="Quantity" value={`${header.qty} ${header.unit}`} />
          <Info label="KB Name / Version" value={`${header.kbName} / ${header.kbVersion}`} />
          <Info label="KB Profile" value={header.kbProfile} />
        </div>
      </div>

      {/* CRM structured extraction */}
      <div className="border border-primary-border rounded-lg mb-4 overflow-hidden bg-primary-surface">
        <div className="px-4 py-2.5 bg-primary-strong flex justify-between items-center flex-wrap gap-2">
          <h4 className="text-[#faf8f3] text-xs font-semibold m-0">
            CRM Import Template
            <span className="ml-2 font-normal text-[#c8ccd1]">
              ({extraction.summary.totalFieldsMapped} mapped · {extraction.summary.totalFieldsRequiringMapping} mapping
              required · {extraction.summary.totalManualFieldsRequired} manual · {extraction.summary.extractionConfidence}{' '}
              confidence)
            </span>
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCfgExtractionExcel(extraction, baseName)}
              className="px-3 py-1.5 rounded bg-secondary text-[#faf8f3] text-xs font-semibold"
            >
              Download CRM Excel
            </button>
            <button
              onClick={() => downloadCfgExtractionJson(extraction, baseName)}
              className="px-3 py-1.5 rounded bg-secondary text-[#faf8f3] text-xs font-semibold"
            >
              Download JSON
            </button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto bg-[#faf8f3]">
          <table className="w-full font-mono text-[11.5px] border-collapse">
            <thead>
              <tr>
                {['Field', 'Value', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="sticky top-0 bg-[#e4dccb] text-[#7a6f57] text-left px-2.5 py-1.5 uppercase text-[9.5px] tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRM_TEMPLATE_COLUMNS.map((col, i) => {
                const row = extraction.rawMapping.find((r) => r.mappedField === col);
                const value = extraction.crmRow[col];
                const status =
                  col === 'Raw CFG File Name' || col === 'Extraction Status' || col === 'Manual Review Required' || col === 'Notes'
                    ? ''
                    : row?.mappingStatus ?? (value ? 'Mapped' : 'Manual Input Required');
                return (
                  <tr key={col} className={i % 2 === 0 ? '' : 'bg-[#f2ede2]'}>
                    <td className="px-2.5 py-1 border-b border-[#ece6d8] text-[#4a453e] whitespace-nowrap">{col}</td>
                    <td className="px-2.5 py-1 border-b border-[#ece6d8] text-[#2a2724] whitespace-nowrap">
                      {value || <span className="text-[#b3ac9c]">—</span>}
                    </td>
                    <td className="px-2.5 py-1 border-b border-[#ece6d8] whitespace-nowrap">
                      {status && (
                        <span
                          className={
                            'inline-block text-[9.5px] px-1.5 py-0.5 rounded-full ' +
                            (status === 'Mapped'
                              ? 'bg-[#dcead9] text-[#3c6b3a]'
                              : status === 'Mapping Required'
                                ? 'bg-[#f3e4c6] text-[#8a6a1f]'
                                : 'bg-[#f3d9d9] text-[#8a3a3a]')
                          }
                        >
                          {status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice details */}
      <div className="border border-[#d8d2c4] rounded-lg mb-4 overflow-hidden">
        <div
          onClick={() => setInvoiceOpen((o) => !o)}
          className="px-3.5 py-2 bg-[#eeeae1] text-[#2a2724] text-xs font-semibold flex justify-between items-center cursor-pointer select-none"
        >
          <span>Invoice Details</span>
          <span className="text-[#8a8270] font-mono text-[10px]">{invoiceOpen ? 'Hide' : 'Show'}</span>
        </div>
        {invoiceOpen && (
          <div className="bg-[#fffdf8] p-4 grid grid-cols-2 gap-3">
            <Field label="Customer Name" value={customer} onChange={setCustomer} placeholder="Enter customer name" />
            <Field label="Contact Email" value={email} onChange={setEmail} placeholder="name@company.com" />
            <Field label="Contact Phone" value={phone} onChange={setPhone} placeholder="+xx xxx xxx xxx" />
            <Field label="Invoice Number" value={invoiceNumber} onChange={setInvoiceNumber} placeholder="INV-0001" />
            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as InvoiceMeta['currency'])}
                className="w-full text-sm px-2 py-1.5 border border-[#d8d2c4] rounded bg-[#fffdf8] text-[#2a2724]"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <Field label="Invoice Date" value={invoiceDate} onChange={setInvoiceDate} placeholder="YYYY-MM-DD" />
            <Field label="Due Date" value={dueDate} onChange={setDueDate} placeholder="YYYY-MM-DD" />
            <Field label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms} placeholder="Net 30" />
            <div className="col-span-2">
              <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note printed at the bottom of the invoice"
                rows={2}
                className="w-full text-sm px-2 py-1.5 border border-[#d8d2c4] rounded bg-[#fffdf8] text-[#2a2724] outline-none resize-none"
              />
            </div>
            <div className="col-span-2 pt-3 mt-1 border-t border-[#e4dccb]">
              <h5 className="text-[10px] uppercase tracking-wider text-[#8a8270] font-mono mb-2">Company Info (Offer PDF)</h5>
            </div>
            <Field label="Company Name" value={company.name} onChange={(v) => updateCompany('name', v)} />
            <Field label="OIB" value={company.oib} onChange={(v) => updateCompany('oib', v)} />
            <Field label="Address" value={company.address} onChange={(v) => updateCompany('address', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Postal Code" value={company.postalCode} onChange={(v) => updateCompany('postalCode', v)} />
              <Field label="City" value={company.city} onChange={(v) => updateCompany('city', v)} />
            </div>
            <Field label="Telephone" value={company.phone} onChange={(v) => updateCompany('phone', v)} />
            <Field label="Fax" value={company.fax} onChange={(v) => updateCompany('fax', v)} />
            <Field label="Email" value={company.email} onChange={(v) => updateCompany('email', v)} />
            <Field label="IBAN" value={company.iban} onChange={(v) => updateCompany('iban', v)} />
            <Field label="Bank Name" value={company.bankName} onChange={(v) => updateCompany('bankName', v)} />

            <div className="col-span-2 pt-3 mt-1 border-t border-[#e4dccb]">
              <h5 className="text-[10px] uppercase tracking-wider text-[#8a8270] font-mono mb-2">Customer Address (Offer PDF)</h5>
            </div>
            <Field label="Street Address" value={customerStreet} onChange={setCustomerStreet} placeholder="Street and number" />
            <Field label="Customer OIB" value={customerOib} onChange={setCustomerOib} placeholder="Optional" />
            <Field label="Postal Code" value={customerPostalCode} onChange={setCustomerPostalCode} />
            <Field label="City" value={customerCity} onChange={setCustomerCity} />

            <div className="col-span-2 pt-3 mt-1 border-t border-[#e4dccb]">
              <h5 className="text-[10px] uppercase tracking-wider text-[#8a8270] font-mono mb-2">Offer Info (Offer PDF)</h5>
            </div>
            <Field label="Place" value={place} onChange={setPlace} placeholder="e.g. Čakovec" />
            <Field label="Valid Until" value={validUntil} onChange={setValidUntil} placeholder="YYYY-MM-DD" />
            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-1">
                Tech Spec Language
              </label>
              <select
                value={techSpecLanguage}
                onChange={(e) => setTechSpecLanguage(e.target.value as TechSpecLanguage)}
                className="w-full text-sm px-2 py-1.5 border border-[#d8d2c4] rounded bg-[#fffdf8] text-[#2a2724]"
              >
                <option value="hr">Croatian</option>
                <option value="en">English</option>
              </select>
            </div>

            <p className="col-span-2 text-[10.5px] text-[#8a8270] font-mono">
              Offer Number / Offer Date reuse the Invoice Number / Invoice Date fields above. Offer fields flagged
              &quot;Mapping Required&quot; in the CRM Import Template above will show the raw CFG code inline until mapped.
            </p>

            {invoiceError && <p className="col-span-2 text-[11px] text-secondary-dark font-mono">{invoiceError}</p>}
            <div className="col-span-2 flex gap-2 flex-wrap">
              <button
                onClick={handlePreviewInvoicePdf}
                className="px-4 py-2 rounded border border-primary-strong text-primary font-semibold text-xs hover:bg-[#f2eee4]"
              >
                Preview Invoice PDF
              </button>
              <button
                onClick={handleDownloadInvoicePdf}
                className="px-4 py-2 rounded bg-primary-strong text-[#faf8f3] font-semibold text-xs hover:bg-primary-hover"
              >
                Download Invoice PDF
              </button>
              <button
                onClick={handlePreviewOfferPdf}
                disabled={offerBusy}
                className="px-4 py-2 rounded border border-primary-strong text-primary font-semibold text-xs hover:bg-[#f2eee4] disabled:opacity-50"
              >
                {offerBusy ? 'Working…' : 'Preview Offer PDF'}
              </button>
              <button
                onClick={handleDownloadOfferPdf}
                disabled={offerBusy}
                className="px-4 py-2 rounded bg-primary-strong text-[#faf8f3] font-semibold text-xs hover:bg-primary-hover disabled:opacity-50"
              >
                {offerBusy ? 'Working…' : 'Download Offer PDF'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() =>
            downloadCsv(
              cstics.map((c) => [c.charc, c.value, c.author, c.invisible]),
              ['Characteristic', 'Value', 'Author', 'Invisible'],
              baseName + '_cstics.csv'
            )
          }
          className="px-3 py-1.5 rounded bg-secondary text-[#faf8f3] text-xs font-semibold"
        >
          Download CSTICS CSV
        </button>
        <button
          onClick={() =>
            downloadCsv(
              conditions.map((c) => [c.type, c.name, c.pricingUnit, c.pricingValue, c.rateUnit, c.rateValue]),
              ['Type', 'Name/Code', 'Pricing Unit', 'Pricing Qty', 'Rate Unit', 'Rate Value'],
              baseName + '_conditions.csv'
            )
          }
          className="px-3 py-1.5 rounded bg-secondary text-[#faf8f3] text-xs font-semibold"
        >
          Download CONDITIONS CSV
        </button>
      </div>

      <Table
        title="Characteristics (CSTICS)"
        count={cstics.length}
        head={['#', 'Characteristic', 'Value', 'Author', 'Invisible']}
        rows={cstics.map((c, i) => [String(i + 1), c.charc, c.value, c.author, c.invisible])}
      />

      <Table
        title="Pricing Conditions (CONDITIONS)"
        count={conditions.length}
        head={['#', 'Type', 'Name / Code', 'Unit', 'Qty', 'Rate Unit', 'Rate Value']}
        rows={conditions.map((c, i) => [
          String(i + 1),
          c.type,
          c.name,
          c.pricingUnit,
          c.pricingValue,
          c.rateUnit,
          c.rateValue,
        ])}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-0.5">{label}</label>
      <span className="font-mono text-[13px] text-[#2a2724]">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-2 py-1.5 border border-[#d8d2c4] rounded bg-[#fffdf8] text-[#2a2724] outline-none"
      />
    </div>
  );
}

function Table({ title, count, head, rows }: { title: string; count: number; head: string[]; rows: string[][] }) {
  return (
    <div className="border border-primary-border rounded-lg mb-4 overflow-hidden bg-primary-surface">
      <div className="px-4 py-2.5 bg-primary-strong flex justify-between items-center">
        <h4 className="text-[#faf8f3] text-xs font-semibold m-0">{title}</h4>
        <span className="text-[#8b9198] font-mono text-[11px]">{count} rows</span>
      </div>
      <div className="max-h-[420px] overflow-auto bg-[#faf8f3]">
        <table className="w-full font-mono text-[11.5px] border-collapse">
          <thead>
            <tr>
              {head.map((h) => (
                <th
                  key={h}
                  className="sticky top-0 bg-[#e4dccb] text-[#7a6f57] text-left px-2.5 py-1.5 uppercase text-[9.5px] tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? '' : 'bg-[#f2ede2]'}>
                {r.map((c, j) => (
                  <td key={j} className="px-2.5 py-1 border-b border-[#ece6d8] text-[#4a453e] whitespace-nowrap">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
