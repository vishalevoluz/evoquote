'use client';

import { useState } from 'react';
import type { ParsedQuote } from '@/types';
import { downloadQuotePdf } from '@/lib/pdf';

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
