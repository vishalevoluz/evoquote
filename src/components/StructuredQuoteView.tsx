'use client';

import { useState } from 'react';
import type { CompanyInfo, InvoiceMeta, TechSpecLanguage, ParsedQuote } from '@/types';
import { downloadQuotePdf } from '@/lib/pdf';
import { downloadInvoicePdf, previewInvoicePdf } from '@/lib/invoicePdf';
import { DEFAULT_COMPANY_INFO, downloadOfferPdf, previewOfferPdf } from '@/lib/offerPdf';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtMoney(v: number | null) {
  if (v == null) return '—';
  return '€' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function StructuredQuoteView({
  quote,
  sessionId,
  onSaved,
}: {
  quote: ParsedQuote;
  sessionId: string;
  onSaved: (msg: string) => void;
}) {
  const [customer, setCustomer] = useState(quote.customer || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [owner, setOwner] = useState('');
  const [stage, setStage] = useState<'new' | 'quoted' | 'won' | 'lost'>('quoted');
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDaysIso(30));
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [currency, setCurrency] = useState<InvoiceMeta['currency']>('EUR');
  const [notes, setNotes] = useState('');
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerPostalCode, setCustomerPostalCode] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerOib, setCustomerOib] = useState('');
  const [place, setPlace] = useState(DEFAULT_COMPANY_INFO.city);
  const [validUntil, setValidUntil] = useState(plusDaysIso(15));
  const [techSpecLanguage, setTechSpecLanguage] = useState<TechSpecLanguage>('hr');
  const [offerBusy, setOfferBusy] = useState(false);

  function updateCompany<K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) {
    setCompany((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/crm/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sourceFile: quote.sourceFile,
          customer,
          email,
          phone,
          owner,
          stage,
          materialNo: quote.materialNo,
          quantity: quote.quantity,
          grandTotal: quote.grandTotal,
          sections: quote.sections,
          summary: quote.summary,
        }),
      });
      const result = await res.json();
      onSaved(result.ok ? `Saved to CRM (${result.mode}): ${result.message}` : `CRM save failed: ${result.message}`);
    } catch (err) {
      onSaved(`Could not reach CRM save endpoint: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadPdf() {
    downloadQuotePdf(quote, { customer, email, phone, owner, stage });
  }

  function validateInvoiceInputs(): boolean {
    if (!customer.trim()) {
      onSaved('Enter a customer name before generating an invoice.');
      return false;
    }
    if (!invoiceNumber.trim()) {
      onSaved('Enter an invoice number before generating an invoice.');
      return false;
    }
    return true;
  }

  function handleDownloadInvoicePdf() {
    if (!validateInvoiceInputs()) return;
    downloadInvoicePdf(
      quote,
      { customer, email, phone },
      { invoiceNumber, invoiceDate, dueDate, paymentTerms, currency, notes }
    );
  }

  function handlePreviewInvoicePdf() {
    if (!validateInvoiceInputs()) return;
    previewInvoicePdf(
      quote,
      { customer, email, phone },
      { invoiceNumber, invoiceDate, dueDate, paymentTerms, currency, notes }
    );
  }

  function validateOfferInputs(): boolean {
    if (!customer.trim()) {
      onSaved('Enter a customer name before generating an offer.');
      return false;
    }
    if (!invoiceNumber.trim()) {
      onSaved('Enter an offer number before generating an offer.');
      return false;
    }
    return true;
  }

  function offerArgs() {
    return [
      quote,
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
      await previewOfferPdf(...offerArgs());
    } finally {
      setOfferBusy(false);
    }
  }

  async function handleDownloadOfferPdf() {
    if (!validateOfferInputs()) return;
    setOfferBusy(true);
    try {
      await downloadOfferPdf(...offerArgs());
    } finally {
      setOfferBusy(false);
    }
  }

  return (
    <div>
      {/* Nameplate */}
      <div className="relative bg-gradient-to-b from-[#f2eee4] to-[#eeeae1] border border-[#d8d2c4] rounded-lg p-5 mb-4 shadow-lg">
        <h3 className="font-mono text-lg text-[#2a2724] mb-0.5">
          {customer ? `${customer} — ` : ''}
          {quote.title ? 'Equipment Configuration' : 'Quote Record'}
        </h3>
        <div className="font-mono text-[11px] text-[#7a7266] mb-3">
          {quote.title}
          {quote.kbVersion ? ` · Kb ${quote.kbVersion}` : ''}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer Name" value={customer} onChange={setCustomer} placeholder="Enter customer name" />
          <Field label="Contact Email" value={email} onChange={setEmail} placeholder="name@company.com" />
          <Field label="Contact Phone" value={phone} onChange={setPhone} placeholder="+xx xxx xxx xxx" />
          <Field label="Deal Owner" value={owner} onChange={setOwner} placeholder="Sales rep name" />
          <div>
            <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-1">
              Deal Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as typeof stage)}
              className="w-full text-sm px-2 py-1.5 border border-[#d8d2c4] rounded bg-[#fffdf8] text-[#2a2724]"
            >
              <option value="new">New</option>
              <option value="quoted">Quoted</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <ReadonlyField label="Material No." value={quote.materialNo} />
          <ReadonlyField label="Quantity" value={quote.quantity} />
          <ReadonlyField label="Quote Date" value={quote.date} />
        </div>
      </div>

      {/* Sections */}
      {quote.sections.map((s, si) => (
        <div key={si} className="border border-primary-border rounded-lg mb-3 overflow-hidden bg-primary-surface">
          <div
            onClick={() => setCollapsed((c) => ({ ...c, [si]: !c[si] }))}
            className="px-3.5 py-2 bg-primary-strong text-[#faf8f3] text-xs font-semibold flex justify-between items-center cursor-pointer select-none"
          >
            <span>
              {s.name} <span className="text-[#666e77] font-normal">({s.items.length})</span>
            </span>
            <span className="font-mono text-[#5b7e9a] text-xs">{fmtMoney(s.subtotal)}</span>
          </div>
          {!collapsed[si] && (
            <div className="bg-[#faf8f3] overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {['Code', 'Feature', 'Spec / Value', 'Unit €', 'Total €', 'Cond.'].map((h) => (
                      <th
                        key={h}
                        className="text-left font-mono text-[9.5px] uppercase tracking-wide text-[#8a8270] px-2.5 py-1.5 border-b border-[#d8d2c4] bg-[#f2ede2]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.items.map((it, ii) => {
                    const zero = !it.totalPriceGross;
                    return (
                      <tr key={ii}>
                        <td className="font-mono text-[10px] text-[#9a8f7a] px-2.5 py-1.5 border-b border-[#ece6d8]">
                          {it.code.split(' ')[0]}
                        </td>
                        <td className="px-2.5 py-1.5 border-b border-[#ece6d8] text-[#2a2724]">
                          {it.feature}
                          <br />
                          <span className="text-[#9a8f7a] text-[10.5px]">{it.value}</span>
                        </td>
                        <td className="px-2.5 py-1.5 border-b border-[#ece6d8] text-[11px] text-[#5e584c] max-w-[280px]">
                          {it.description.slice(0, 140)}
                          {it.description.length > 140 ? '…' : ''}
                        </td>
                        <td className={`px-2.5 py-1.5 border-b border-[#ece6d8] font-mono text-right ${zero ? 'text-[#b3ac9c]' : ''}`}>
                          {it.unitPriceGross != null ? it.unitPriceGross.toLocaleString() : '—'}
                        </td>
                        <td className={`px-2.5 py-1.5 border-b border-[#ece6d8] font-mono text-right ${zero ? 'text-[#b3ac9c]' : ''}`}>
                          {it.totalPriceGross != null ? it.totalPriceGross.toLocaleString() : '—'}
                        </td>
                        <td className="px-2.5 py-1.5 border-b border-[#ece6d8]">
                          {it.conditionType && (
                            <span className="inline-block font-mono text-[9.5px] px-1.5 py-0.5 rounded-full bg-[#e4dccb] text-[#7a6f57]">
                              {it.conditionType}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Summary */}
      <div className="bg-[#eeeae1] border border-[#d8d2c4] rounded-lg p-4 mb-4">
        <h4 className="text-[11px] uppercase tracking-wide text-[#8a8270] font-mono mb-2">Pricing Summary</h4>
        {quote.summary
          .filter((s) => s.grossTotal != null || s.netTotal != null)
          .map((s, i) => (
            <div key={i} className="flex justify-between py-1 text-[12.5px] border-b border-dashed border-[#d8d2c4] last:border-0">
              <span>{s.label}</span>
              <span className="font-mono">{fmtMoney(s.grossTotal ?? s.netTotal)}</span>
            </div>
          ))}
        <div className="flex justify-between items-baseline mt-2.5 pt-2.5 border-t-2 border-secondary-dark">
          <span className="text-xs font-bold uppercase tracking-wide text-[#2a2724]">Total Price</span>
          <span className="font-mono text-xl font-bold text-secondary-dark">{fmtMoney(quote.grandTotal)}</span>
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
              Offer Number / Offer Date reuse the Invoice Number / Invoice Date fields above.
            </p>

            <div className="col-span-2 flex gap-2">
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

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-secondary text-[#faf8f3] font-semibold text-xs disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save to CRM'}
        </button>
        <button
          onClick={handleDownloadPdf}
          className="px-4 py-2 rounded bg-[#faf8f3] text-primary font-semibold text-xs hover:bg-white"
        >
          Download PDF
        </button>
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
      </div>
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[9.5px] uppercase tracking-wider text-[#8a8270] font-mono mb-1">{label}</label>
      <input
        readOnly
        value={value}
        className="w-full text-xs font-mono px-2 py-1.5 border border-[#d8d2c4] rounded bg-[#eee9dd] text-[#5e584c]"
      />
    </div>
  );
}
