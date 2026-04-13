"""
CadmusEngine — core CADMUS spec generation API.

Usage:
    from cadmus import CadmusEngine, ExportType

    engine = CadmusEngine(api_key="sk-...")   # or set OPENAI_API_KEY env var
    spec = engine.create_spec("A compliance document tracker for financial services")
    print(spec.scores.label)                  # BUILD-READY / SOLID / DEVELOPING / WEAK
    prd = engine.export(spec, ExportType.PRD)
"""

import json
import os
from typing import Optional, Union

from .models import ExportType, ExtractedIdea, Spec, SpecScores


_FAST_MODEL = "gpt-4o-mini"
_SMART_MODEL = "gpt-4o"

_SECTION_QUESTIONS = {
    "objective":  ["What exact problem is this solving?", "Who is it for?", "What does success look like?"],
    "scope":      ["What is included in v1?", "What is explicitly out of scope?"],
    "inputs":     ["What data enters the system?", "Where does it come from?"],
    "outputs":    ["What must the system produce?", "What constitutes a valid output?"],
    "logic":      ["How do inputs become outputs?", "What rules or thresholds matter?"],
    "edge_cases": ["What happens if data is missing?", "What if the user inputs garbage?"],
    "state":      ["What persists over time?", "What state transitions exist?"],
    "ux":         ["What are the main screens?", "What must always be visible?"],
    "entities":   ["What objects exist in the system?", "How do they relate?"],
    "phases":     ["What is MVP?", "What is Phase 2?"],
}

_EXPORT_PROMPTS = {
    ExportType.FULL_SPEC:           "Generate a complete structured product specification. Include: Executive Summary, Objective, Users, Scope, Inputs/Outputs, Logic, Edge Cases, State, UX, Entity Model, Phase Plan. Clean markdown.",
    ExportType.PRD:                 "Generate a Product Requirements Document. Include: Overview, Problem Statement, Goals, User Stories, Feature Requirements, Non-Functional Requirements, Out of Scope. Clean markdown.",
    ExportType.ENGINEERING_HANDOFF: "Generate an Engineering Handoff doc. Include: Technical Overview, Data Models, API Surface, Business Logic Notes, Edge Case Handling, Performance Requirements, Definition of Done. Clean markdown.",
    ExportType.AI_BUILD_PROMPT:     "Generate an AI Build Prompt for Claude Code or Cursor. Include: project context, tech stack, file structure, implementation order, component-level instructions. Optimised for AI coding agents.",
    ExportType.PHASE_PLAN:          "Generate a Phase Plan. Define MVP, Phase 2, Phase 3 with goals, features in/out, success criteria, and complexity. Clean markdown.",
    ExportType.TEST_CASES:          "Generate comprehensive test cases: unit tests, integration scenarios, edge case tests, user acceptance criteria. Structured test plan in markdown.",
    ExportType.EDGE_CASE_CHECKLIST: "Generate an exhaustive edge case checklist: input validation, network failures, data consistency, concurrency, system limits. Structured checklist in markdown.",
    ExportType.DECK_OUTLINE:        "Generate a pitch deck outline: Problem, Solution, How It Works, Users, Features, Architecture, Differentiation, Roadmap, Metrics. Slide-by-slide in markdown.",
}


class CadmusEngine:
    """
    CADMUS spec generation engine.

    Args:
        api_key:    OpenAI API key. Falls back to OPENAI_API_KEY environment variable.
        fast_model: Model for extraction and scoring (default: gpt-4o-mini).
        smart_model: Model for export generation (default: gpt-4o).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        fast_model: str = _FAST_MODEL,
        smart_model: str = _SMART_MODEL,
    ):
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "The 'openai' package is required. Install it with: pip install openai"
            )

        key = api_key or os.environ.get("OPENAI_API_KEY")
        if not key:
            raise ValueError(
                "OpenAI API key required. Pass api_key=... or set OPENAI_API_KEY env var."
            )

        self._client = OpenAI(api_key=key)
        self._fast = fast_model
        self._smart = smart_model

    def extract(self, raw_idea: str) -> ExtractedIdea:
        """
        Parse a raw idea string into structured components.

        Returns:
            ExtractedIdea with objective, users, inputs, outputs, questions.
        """
        resp = self._client.chat.completions.create(
            model=self._fast,
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CADMUS. Extract structured JSON from a raw product idea. "
                        "Return ONLY valid JSON with keys: objective (string), users (array), "
                        "inputs (array), outputs (array), questions (array). No markdown."
                    ),
                },
                {"role": "user", "content": f"Raw idea: {raw_idea}"},
            ],
        )
        text = resp.choices[0].message.content.strip()
        text = _strip_code_fence(text)
        data = json.loads(text)
        return ExtractedIdea(raw_idea=raw_idea, **data)

    def score(self, spec: Union[Spec, dict]) -> SpecScores:
        """
        Score a spec on five dimensions: clarity, completeness, logic_integrity,
        edge_case, build_readiness.

        Args:
            spec: A Spec object or a dict of section_name → answer_text.
        """
        if isinstance(spec, Spec):
            answers = spec.answers
        else:
            answers = spec

        content = "\n\n".join(
            f"[{s.upper()}]\n{a}" for s, a in answers.items()
        )
        resp = self._client.chat.completions.create(
            model=self._fast,
            max_tokens=512,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CADMUS scoring a product spec. Return ONLY valid JSON with "
                        "integer scores 0-100 for: clarity, completeness, logic_integrity, "
                        "edge_case, build_readiness. Also include a 'reasoning' string "
                        "(1-2 sentences). No markdown."
                    ),
                },
                {"role": "user", "content": f"Score this spec:\n\n{content}"},
            ],
        )
        text = _strip_code_fence(resp.choices[0].message.content.strip())
        data = json.loads(text)
        return SpecScores(**data)

    def create_spec(self, raw_idea: str) -> Spec:
        """
        Full pipeline: extract → quick spec → score.
        No interactive input. Returns a ready Spec object.

        Args:
            raw_idea: Plain-text description of the product idea.
        """
        idea = self.extract(raw_idea)
        answers = _quick_answers(idea)
        content = _assemble_content(raw_idea, answers)
        scores = self.score(answers)
        spec = Spec(idea=idea, answers=answers, content=content, scores=scores)
        return spec

    def export(
        self,
        spec: Union[Spec, str],
        export_type: Union[ExportType, str],
    ) -> str:
        """
        Generate a document from a spec.

        Args:
            spec:        A Spec object or raw spec content string.
            export_type: An ExportType enum value or string name (e.g. "prd").

        Returns:
            Generated document as a markdown string.
        """
        if isinstance(export_type, str):
            export_type = ExportType(export_type)

        prompt = _EXPORT_PROMPTS.get(export_type)
        if not prompt:
            raise ValueError(f"Unknown export type: {export_type}")

        spec_content = spec.content if isinstance(spec, Spec) else spec

        stream = self._client.chat.completions.create(
            model=self._smart,
            max_tokens=4096,
            stream=True,
            messages=[
                {"role": "system", "content": f"You are CADMUS. {prompt}"},
                {"role": "user", "content": f"Generate from this spec:\n\n{spec_content}"},
            ],
        )

        chunks = []
        for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            chunks.append(text)

        return "".join(chunks)

    def export_types(self) -> list:
        """Return list of available export type names."""
        return [e.value for e in ExportType]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _strip_code_fence(text: str) -> str:
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def _quick_answers(idea: ExtractedIdea) -> dict:
    return {
        "objective": (
            f"Objective: {idea.objective}\n"
            f"Users: {', '.join(idea.users)}\n"
            f"Inputs: {', '.join(idea.inputs)}\n"
            f"Outputs: {', '.join(idea.outputs)}"
        ),
        **(
            {"open_questions": "Unresolved: " + "; ".join(idea.questions)}
            if idea.questions
            else {}
        ),
    }


def _assemble_content(raw_idea: str, answers: dict) -> str:
    lines = [f"RAW IDEA:\n{raw_idea}\n"]
    for section, answer in answers.items():
        lines.append(f"[{section.upper()}]\n{answer}")
    return "\n\n".join(lines)
