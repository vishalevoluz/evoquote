import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return <AppShell userEmail={user?.email ?? null} />;
}
