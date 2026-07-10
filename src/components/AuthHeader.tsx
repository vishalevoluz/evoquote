'use client';

import { useRouter } from 'next/navigation';

export function AuthHeader({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {userEmail && <span className="text-[11px] font-mono text-[#8b9198]">{userEmail}</span>}
      {userEmail && (
        <button onClick={signOut} className="text-xs px-3 py-1.5 rounded border border-[#454b52] text-[#faf8f3] hover:border-[#d9631e]">
          Sign out
        </button>
      )}
    </div>
  );
}
