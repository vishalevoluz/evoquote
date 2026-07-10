import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/parsers/excelParser';
import { parseCfgFile } from '@/lib/parsers/cfgParser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer, file.name);
      return NextResponse.json({ type: 'excel', data: result });
    }

    if (name.endsWith('.cfg') || name.endsWith('.xml')) {
      const text = await file.text();
      const result = parseCfgFile(text, file.name);
      return NextResponse.json({ type: 'cfg', data: result });
    }

    return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: `Failed to parse file: ${(err as Error).message}` }, { status: 500 });
  }
}
