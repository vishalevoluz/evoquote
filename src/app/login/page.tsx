'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError('Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL / ANON_KEY to .env.local.');
      return;
    }

    setLoading(true);
    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm bg-primary-panel border border-primary-border rounded-lg p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-white rounded px-2 py-1 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://autokuca.hr/wp-content/uploads/2022/05/akglogo.png" alt="AutoKuca" className="h-7 w-auto object-contain" />
          </div>
          <h1 className="text-[#faf8f3] font-semibold text-base">AutoKuca Quote</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b9198] font-mono mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#faf8f3] text-[#2a2724] text-sm outline-none"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b9198] font-mono mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#faf8f3] text-[#2a2724] text-sm outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[#e5bfbf] text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-secondary text-[#faf8f3] font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full mt-4 text-xs text-[#8b9198] hover:text-secondary"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
