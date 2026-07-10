'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UploadZone } from '@/components/UploadZone';
import { ExcelRawView } from '@/components/ExcelRawView';
import { StructuredQuoteView } from '@/components/StructuredQuoteView';
import { CfgView } from '@/components/CfgView';
import { AuthHeader } from '@/components/AuthHeader';
import type { ExcelParseResult, CfgParseResult } from '@/types';

type ParsedResult =
  | { type: 'excel'; data: ExcelParseResult }
  | { type: 'cfg'; data: CfgParseResult };

export function AppShell({ userEmail }: { userEmail: string | null }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Failed to parse file');
        setBusy(false);
        return;
      }
      setResult(json as ParsedResult);

      const newSessionId = uuidv4();
      setSessionId(newSessionId);

      const materialNo =
        json.type === 'excel' ? json.data.structured?.materialNo : json.data.header?.materialNo;
      const grandTotal = json.type === 'excel' ? json.data.structured?.grandTotal : null;

      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          fileName: file.name,
          fileType: json.type,
          materialNo,
          grandTotal,
        }),
      }).catch(() => {});

      showToast(`Parsed ${file.name}`);
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1f22]">
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#25292d] border-b-2 border-[#d9631e]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-[#d9631e] flex items-center justify-center font-mono font-bold text-[#1c1f22] text-[13px]">
            AQ
          </div>
          <div>
            <h1 className="text-[#faf8f3] text-base font-semibold m-0">AutoKuca Quote</h1>
            <span className="text-[#8b9198] text-[11px] font-mono uppercase tracking-wide">
              Excel &amp; CFG structuring tool
            </span>
          </div>
        </div>
        <AuthHeader userEmail={userEmail} />
      </div>

      <div className="max-w-[1300px] mx-auto p-5">
        <UploadZone onFile={handleFile} busy={busy} />

        {sessionId && (
          <p className="mt-3 text-[11px] font-mono text-[#666e77]">
            Session: {sessionId} {fileName && `· ${fileName}`}
          </p>
        )}

        {result && (
          <div className="mt-5 grid grid-cols-1 gap-4">
            <div>
              <h2 className="text-[11px] uppercase tracking-wider text-[#9aa1a8] font-mono mb-2">
                Uploaded File — Raw View
              </h2>
              {result.type === 'excel' ? (
                <ExcelRawView sheets={result.data.sheets} />
              ) : (
                <p className="text-[#9aa1a8] text-xs font-mono">
                  Raw XML view not shown for .cfg files — see structured tables on the right.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-[11px] uppercase tracking-wider text-[#9aa1a8] font-mono mb-2">
                Structured {result.type === 'excel' ? 'CRM Record' : 'Configuration Data'}
              </h2>
              {result.type === 'excel' && result.data.structured && sessionId && (
                <StructuredQuoteView quote={result.data.structured} sessionId={sessionId} onSaved={showToast} />
              )}
              {result.type === 'excel' && !result.data.structured && (
                <p className="text-[#9aa1a8] text-xs font-mono">Could not detect a structured quote sheet.</p>
              )}
              {result.type === 'cfg' && <CfgView data={result.data} />}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#d9631e] text-[#1c1f22] px-4.5 py-2.5 rounded-md text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
