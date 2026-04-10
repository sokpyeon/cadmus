import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EXPORT_PROMPTS: Record<string, string> = {
  full_spec: `You are CADMUS. Generate a complete, comprehensive product specification document from the provided spec content. Include: Executive Summary, Objective, Users, Scope, Data Inputs/Outputs, Logic Rules, Edge Cases, State Management, UX Requirements, Entity Model, and Phase Plan. Format in clean markdown.`,
  prd: `You are CADMUS. Generate a Product Requirements Document (PRD) from the spec content. Include: Overview, Problem Statement, Goals & Success Metrics, User Stories, Feature Requirements, Non-Functional Requirements, and Out of Scope. Format in clean markdown with clear sections.`,
  engineering_handoff: `You are CADMUS. Generate an Engineering Handoff document from the spec content. Include: Technical Overview, Data Models, API Surface Area, Business Logic Implementation Notes, Edge Case Handling, Performance Requirements, and Definition of Done. Format in clean markdown.`,
  ai_build_prompt: `You are CADMUS. Generate an AI Build Prompt — a detailed, structured prompt that an AI coding assistant (like Claude Code or Cursor) could use to implement this system. Include: Project context, tech stack recommendations, file structure, implementation order, and specific implementation instructions per component. Format clearly for AI consumption.`,
  phase_plan: `You are CADMUS. Generate a Phase Plan from the spec content. Define MVP, Phase 2, Phase 3 with: goals, features included, features deferred, success criteria, and estimated complexity for each phase. Format in clean markdown.`,
  test_cases: `You are CADMUS. Generate comprehensive test cases from the spec content. Include: Unit test cases for business logic, Integration test scenarios, Edge case tests, User acceptance criteria, and Performance test scenarios. Format as a structured test plan in markdown.`,
  edge_case_checklist: `You are CADMUS. Generate an exhaustive edge case checklist from the spec content. Include: Input validation failures, Network/timeout scenarios, Data consistency scenarios, Concurrency issues, and System limit scenarios. Format as a structured checklist in markdown.`,
  deck_outline: `You are CADMUS. Generate a pitch/presentation deck outline from the spec content. Include slide-by-slide breakdown: Problem, Solution, How it works, Target users, Key features, Technical architecture, Competitive differentiation, Roadmap, and Success metrics. Format as a clear slide outline in markdown.`,
};

export async function POST(req: NextRequest) {
  try {
    const { exportType, specContent } = await req.json();

    if (!exportType || !specContent) {
      return new Response(JSON.stringify({ error: 'exportType and specContent are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = EXPORT_PROMPTS[exportType];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: 'Invalid export type' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate the ${exportType.replace(/_/g, ' ')} from this specification:\n\n${specContent}` },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate export' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
