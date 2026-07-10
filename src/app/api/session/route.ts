import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, fileName, fileType, materialNo, grandTotal } = body ?? {};

  if (!sessionId || !fileName) {
    return NextResponse.json({ error: 'sessionId and fileName are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // Supabase not configured — degrade gracefully so the UI flow still works.
    return NextResponse.json({ ok: true, persisted: false, message: 'Supabase not configured — session not persisted.' });
  }

  const supabase = await createClient();
  const { data: userData } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const { error } = await admin.from('sessions').upsert({
    id: sessionId,
    user_id: userData?.user?.id ?? null,
    file_name: fileName,
    file_type: fileType ?? null,
    material_no: materialNo ?? null,
    grand_total: grandTotal ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ ok: false, persisted: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
