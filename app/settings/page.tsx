'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase';

export default function SettingsPage() {
  const supabase = getSupabaseBrowserClient();
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserEmail(user.email || '');

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_user_id', user.id)
        .single();

      if (workspace) {
        setWorkspaceName(workspace.name);
        setWorkspaceId(workspace.id);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (workspaceId) {
      await supabase
        .from('workspaces')
        .update({ name: workspaceName, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell breadcrumb="Settings">
      <div className="p-8 max-w-2xl">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">Settings</h1>
          <p className="text-on-surface-variant">Manage your workspace and account preferences.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="clay-card p-8 rounded-lg border border-white/60">
            <h2 className="font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">corporate_fare</span>
              Workspace
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">
                  Workspace Name
                </label>
                <div className="clay-inset rounded-xl p-1 focus-within:ring-2 ring-primary/20 transition-all">
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Workspace"
                    className="w-full bg-transparent border-none focus:ring-0 text-on-surface text-sm px-4 py-3 outline-none placeholder-outline"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="clay-card p-8 rounded-lg border border-white/60">
            <h2 className="font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              Account
            </h2>
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="clay-inset rounded-xl px-4 py-3">
                <span className="text-sm text-on-surface-variant">{userEmail || 'Not signed in'}</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                Email is managed through your magic link authentication.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="sculpted-pill text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:translate-y-[-2px] transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saved ? (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Saved!
              </>
            ) : saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
