'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import ProjectCard from '@/components/project/ProjectCard';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Project } from '@/types';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    loadProjects();
  }, []);

  return (
    <AppShell breadcrumb="Dashboard">
      <div className="p-8 space-y-8">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Active Projects</h2>
            <p className="text-on-surface-variant">
              {loading ? 'Loading...' : `${projects.length} specification${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/projects/new"
              className="sculpted-pill text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:translate-y-[-2px] transition-transform active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Specification
            </Link>
          </div>
        </section>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="clay-card rounded-lg h-[240px] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}

                {/* Add New */}
                <Link href="/projects/new">
                  <div className="border-2 border-dashed border-surface-high rounded-lg flex flex-col items-center justify-center h-[240px] gap-4 group cursor-pointer hover:bg-surface-container-low transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <span className="material-symbols-outlined">add</span>
                    </div>
                    <span className="font-bold text-on-surface-variant">New Specification</span>
                  </div>
                </Link>
              </div>
            )}

            {!loading && projects.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">architecture</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">No specs yet</h3>
                <p className="text-on-surface-variant mb-6">Start sculpting your first specification.</p>
                <Link
                  href="/projects/new"
                  className="sculpted-pill text-white px-8 py-3 rounded-full font-bold shadow-lg hover:translate-y-[-2px] transition-transform"
                >
                  Create First Spec
                </Link>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="clay-card bg-surface-container p-6 rounded-lg">
              <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface-variant mb-4">
                Quick Actions
              </h4>
              <div className="space-y-2">
                <Link
                  href="/projects/new"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-high transition-colors text-on-surface"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                  <span className="text-sm font-medium">New Project</span>
                </Link>
                <Link
                  href="/templates"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-high transition-colors text-on-surface"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">library_books</span>
                  <span className="text-sm font-medium">Browse Templates</span>
                </Link>
              </div>
            </div>

            <div className="clay-card bg-surface-container p-6 rounded-lg">
              <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface-variant mb-4">
                Tips
              </h4>
              <div className="space-y-3">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  💡 Complete all 10 spec sections to unlock a Build Readiness score above 85.
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  🎯 Use the Objective section to anchor your entire specification — everything flows from it.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
