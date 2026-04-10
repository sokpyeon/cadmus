'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

type Mode = 'magic' | 'password';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('password');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f4] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div style={{background:'#f0ede8',boxShadow:'10px 10px 20px rgba(31,36,48,0.03),-10px -10px 20px rgba(255,255,255,0.8)'}} className="p-10 rounded-2xl border border-white/60">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1c1c19]">CADMUS</h1>
            <p className="text-[#43474d] text-sm mt-2">Your idea is not a spec. Let&apos;s fix that.</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6 p-1 rounded-full" style={{background:'#f6f3ee'}}>
            <button
              onClick={() => { setMode('password'); setError(''); setSent(false); }}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${mode === 'password' ? 'bg-[#405873] text-white shadow' : 'text-[#43474d]'}`}
            >
              Email + Password
            </button>
            <button
              onClick={() => { setMode('magic'); setError(''); setSent(false); }}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${mode === 'magic' ? 'bg-[#405873] text-white shadow' : 'text-[#43474d]'}`}
            >
              Magic Link
            </button>
          </div>

          {sent ? (
            <div className="text-center">
              <h2 className="text-lg font-bold text-[#1c1c19] mb-2">
                {isSignUp ? 'Check your email to confirm' : 'Magic link sent'}
              </h2>
              <p className="text-[#43474d] text-sm">
                We sent a link to <strong>{email}</strong>.
              </p>
            </div>
          ) : mode === 'magic' ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{background:'#f6f3ee',boxShadow:'inset 4px 4px 8px rgba(31,36,48,0.04),inset -4px -4px 8px rgba(255,255,255,0.7)'}}
                className="w-full border-none focus:ring-0 text-[#1c1c19] placeholder-[#74777e] text-sm px-4 py-3 rounded-xl outline-none"
              />
              {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                style={{background:'linear-gradient(145deg,#405873,#58708d)'}}
                className="w-full text-white py-4 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePassword} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{background:'#f6f3ee',boxShadow:'inset 4px 4px 8px rgba(31,36,48,0.04),inset -4px -4px 8px rgba(255,255,255,0.7)'}}
                className="w-full border-none focus:ring-0 text-[#1c1c19] placeholder-[#74777e] text-sm px-4 py-3 rounded-xl outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={{background:'#f6f3ee',boxShadow:'inset 4px 4px 8px rgba(31,36,48,0.04),inset -4px -4px 8px rgba(255,255,255,0.7)'}}
                className="w-full border-none focus:ring-0 text-[#1c1c19] placeholder-[#74777e] text-sm px-4 py-3 rounded-xl outline-none"
              />
              {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email || !password}
                style={{background:'linear-gradient(145deg,#405873,#58708d)'}}
                className="w-full text-white py-4 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-[#43474d] text-sm hover:text-[#405873] transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
