import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { title, rawIdea, projectType, industry, extracted } = await req.json();

  // Get or create default workspace
  let workspaceId: string;
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('name', 'Default Workspace')
    .single();

  if (existing) {
    workspaceId = existing.id;
  } else {
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .insert({ name: 'Default Workspace' })
      .select('id')
      .single();
    if (wsErr || !ws) return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    workspaceId = ws.id;
  }

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      workspace_id: workspaceId,
      title,
      raw_idea: rawIdea,
      project_type: projectType,
      industry,
      status: 'draft',
    })
    .select('id')
    .single();

  if (projErr || !project) return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });

  // Pre-populate objective from extracted data
  if (extracted?.objective) {
    await supabase.from('answers').upsert({
      project_id: project.id,
      section_type: 'objective',
      question_key: 'problem',
      answer_text: extracted.objective,
    });
  }

  return NextResponse.json(project);
}
