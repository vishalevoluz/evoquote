import { NextRequest, NextResponse } from 'next/server';
import { saveToCrm } from '@/lib/crm';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CrmRecordInput } from '@/types';

export async function POST(req: NextRequest) {
  const record = (await req.json()) as CrmRecordInput;

  if (!record?.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const result = await saveToCrm(record);

  const admin = createAdminClient();
  if (admin) {
    await admin.from('crm_sync_log').insert({
      session_id: record.sessionId,
      customer_name: record.customer,
      material_no: record.materialNo,
      grand_total: record.grandTotal,
      mode: result.mode,
      ok: result.ok,
      message: result.message,
      external_id: result.externalId ?? null,
      created_at: new Date().toISOString(),
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
