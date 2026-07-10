'use client';

import { useRef, useState } from 'react';

export function UploadZone({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        drag ? 'border-secondary bg-secondary/[0.06]' : 'border-primary-border hover:border-secondary'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.cfg,.xml"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <strong className="block text-[#faf8f3] text-sm mb-1">
        {busy ? 'Parsing file…' : 'Drop a quote file here, or click to upload'}
      </strong>
      <small className="font-mono text-[11px] text-[#9aa1a8]">
        Accepts .xlsx quote exports (all sheets) and .cfg configuration files
      </small>
    </div>
  );
}
