'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase';

const INDUSTRIES = [
  'Technology', 'Fintech', 'Healthcare', 'E-Commerce', 'Logistics',
  'Education', 'Real Estate', 'Energy', 'Manufacturing', 'Government', 'Other',
];

const PROJECT_TYPES = [
  'SaaS', 'Marketplace', 'Internal Tool', 'Mobile App', 'Data Product',
  'API Platform', 'AI System', 'CRM', 'Productivity', 'Other',
];

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [rawIdea, setRawIdea] = useState('');
  const [industry, setIndustry] = useState('');
  const [projectType, setProjectType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawIdea.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Call extract API
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawIdea }),
      });

      if (!extractRes.ok) throw new Error('Failed to extract idea');

      const extracted = await extractRes.json();

      // Create project without auth (auth disabled)
      const title = extracted.objective
        ? extracted.objective.slice(0, 80)
        : rawIdea.slice(0, 80);

      // Use service role client to bypass RLS
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          rawIdea,
          projectType: projectType || 'Other',
          industry: industry || 'Technology',
          extracted,
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');
      const project = await res.json();

      router.push(`/projects/${project.id}/spec`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <AppShell breadcrumb="New Project">
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
            Describe Your Idea
          </h1>
          <p className="text-on-surface-variant">
            Don&apos;t worry about structure. Just tell us what you&apos;re trying to build.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Idea Input */}
          <div className="clay-card p-8 rounded-lg border border-white/60">
            <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-4">
              Raw Idea
            </label>
            <p className="text-sm text-on-surface-variant mb-4">
              What is this system supposed to do? Who uses it? What problem does it solve? Be as
              vague or specific as you want — CADMUS will extract the structure.
            </p>
            <div className="clay-inset rounded-xl p-1 focus-within:ring-2 ring-primary/20 transition-all">
              <textarea
                value={rawIdea}
                onChange={(e) => setRawIdea(e.target.value)}
                placeholder="e.g. I want to build something like Notion but for oil & gas field crews. They need to track daily reports, equipment status, and team assignments. It should work offline and sync when they get signal..."
                rows={8}
                className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder-outline/60 text-sm resize-none px-4 py-3 outline-none"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-on-surface-variant/50">{rawIdea.length} chars</span>
              {rawIdea.length > 0 && rawIdea.length < 50 && (
                <span className="text-xs text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  More detail = better extraction
                </span>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="clay-card p-6 rounded-lg border border-white/60">
              <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-3">
                Industry
              </label>
              <div className="clay-inset rounded-xl p-1 focus-within:ring-2 ring-primary/20 transition-all">
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface text-sm px-3 py-2.5 outline-none"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="clay-card p-6 rounded-lg border border-white/60">
              <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-3">
                Project Type
              </label>
              <div className="clay-inset rounded-xl p-1 focus-within:ring-2 ring-primary/20 transition-all">
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface text-sm px-3 py-2.5 outline-none"
                >
                  <option value="">Select type...</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error text-sm p-4 bg-error/10 rounded-xl">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !rawIdea.trim()}
            className="w-full sculpted-pill text-white py-4 rounded-xl font-bold shadow-lg hover:translate-y-[-2px] transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                Extracting structure...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Start Sculpting
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
