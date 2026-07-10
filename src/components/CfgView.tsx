'use client';

import type { CfgParseResult } from '@/types';

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
