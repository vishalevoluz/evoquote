'use client';

import { useState } from 'react';
import type { RawSheet } from '@/types';

export function ExcelRawView({ sheets }: { sheets: RawSheet[] }) {
  const [active, setActive] = useState(0);
  const sheet = sheets[active];
  const maxCols = sheet ? sheet.rows.reduce((m, r) => Math.max(m, r.length), 0) : 0;

  return (
    <div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {sheets.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded text-xs font-mono border ${
              i === active
                ? 'bg-secondary text-[#faf8f3] border-secondary font-semibold'
                : 'bg-transparent text-[#9aa1a8] border-primary-border hover:border-secondary'
            }`}
          >
            {s.name} <span className="opacity-60">({s.rows.length})</span>
          </button>
        ))}
      </div>

      <div className="bg-[#faf8f3] border border-[#33383d] rounded-md overflow-auto max-h-[70vh]">
        <table className="border-collapse font-mono text-[11px] w-max min-w-full">
          <tbody>
            {sheet?.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-[#f2ede2]'}>
                <td className="sticky left-0 bg-[#ddd6c4] text-[#8a8270] text-right font-semibold px-2 py-1 border border-[#e5dfd0]">
                  {ri + 1}
                </td>
                {Array.from({ length: maxCols }).map((_, ci) => {
                  const v = row[ci];
                  const display = v == null ? '' : typeof v === 'number' ? v.toLocaleString() : String(v);
                  return (
                    <td
                      key={ci}
                      title={display}
                      className="px-2 py-1 border border-[#e5dfd0] whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis text-[#4a453e]"
                    >
                      {display.slice(0, 60)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
