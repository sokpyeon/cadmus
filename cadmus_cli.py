#!/usr/bin/env python3
"""
CADMUS CLI — Python wrapper for the CADMUS spec engine.
Turns vague ideas into build-ready specs from the command line.

Usage:
    python cadmus_cli.py "your raw idea here"
    python cadmus_cli.py "your raw idea" --export prd
    python cadmus_cli.py "your raw idea" --export ai_build_prompt --out spec.md
    python cadmus_cli.py --exports  # list available export types

Requires:
    pip install openai requests
    OPENAI_API_KEY env var (or pass --key)
"""

import argparse
import json
import os
import sys
from datetime import datetime

try:
    from openai import OpenAI
except ImportError:
    print("ERROR: openai not installed. Run: pip install openai")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────────

FAST_MODEL = "gpt-4o-mini"
SMART_MODEL = "gpt-4o"

SECTION_QUESTIONS = {
    "objective": ["What exact problem is this system solving?", "Who is it for?", "What does success look like?"],
    "scope":     ["What is included in v1?", "What is explicitly out of scope?"],
    "inputs":    ["What data enters the system?", "Where does it come from?"],
    "outputs":   ["What must the system produce?", "What constitutes a valid output?"],
    "logic":     ["How do inputs become outputs?", "What rules or thresholds matter?"],
    "edge_cases":["What happens if data is missing?", "What if the user inputs garbage?"],
    "state":     ["What persists over time?", "What state transitions exist?"],
    "ux":        ["What are the main screens?", "What must always be visible?"],
    "entities":  ["What objects exist in the system?", "How do they relate?"],
    "phases":    ["What is MVP?", "What is Phase 2?"],
}

EXPORT_PROMPTS = {
    "full_spec":            "Generate a complete structured product specification document. Include: Executive Summary, Objective, Users, Scope, Inputs/Outputs, Logic, Edge Cases, State, UX, Entity Model, Phase Plan. Clean markdown.",
    "prd":                  "Generate a Product Requirements Document. Include: Overview, Problem Statement, Goals, User Stories, Feature Requirements, Non-Functional Requirements, Out of Scope. Clean markdown.",
    "engineering_handoff":  "Generate an Engineering Handoff doc. Include: Technical Overview, Data Models, API Surface, Business Logic Notes, Edge Case Handling, Performance Requirements, Definition of Done. Clean markdown.",
    "ai_build_prompt":      "Generate an AI Build Prompt for Claude Code or Cursor. Include: Project context, tech stack, file structure, implementation order, and component-level instructions. Optimized for AI coding agents.",
    "phase_plan":           "Generate a Phase Plan. Define MVP, Phase 2, Phase 3 with goals, features in/out, success criteria, and complexity. Clean markdown.",
    "test_cases":           "Generate comprehensive test cases: unit tests, integration scenarios, edge case tests, user acceptance criteria. Structured test plan in markdown.",
    "edge_case_checklist":  "Generate an exhaustive edge case checklist: input validation, network failures, data consistency, concurrency, system limits. Structured checklist in markdown.",
    "deck_outline":         "Generate a pitch deck outline: Problem, Solution, How It Works, Users, Features, Architecture, Differentiation, Roadmap, Metrics. Slide-by-slide in markdown.",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def print_header():
    print("\n\033[1m\033[36mCADMUS\033[0m\033[2m — AI Spec Engine\033[0m")
    print("\033[2m" + "━" * 50 + "\033[0m\n")

def print_step(label, msg):
    print(f"\033[33m▸ {label:<12}\033[0m {msg}")

def print_ok(msg):
    print(f"\033[32m✓\033[0m {msg}\n")

def print_error(msg):
    print(f"\033[31m✗ {msg}\033[0m")

def score_label(score):
    if score >= 85: return "\033[32mBUILD-READY\033[0m"
    if score >= 70: return "\033[34mSOLID\033[0m"
    if score >= 50: return "\033[33mDEVELOPING\033[0m"
    return "\033[31mWEAK\033[0m"

# ── Core functions ────────────────────────────────────────────────────────────

def extract_idea(client, raw_idea):
    print_step("EXTRACT", "parsing raw idea...")
    resp = client.chat.completions.create(
        model=FAST_MODEL,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": "You are CADMUS. Extract structured JSON from a raw product idea. Return ONLY valid JSON with keys: objective (string), users (array), inputs (array), outputs (array), questions (array). No markdown, no explanation."},
            {"role": "user", "content": f"Raw idea: {raw_idea}"}
        ]
    )
    text = resp.choices[0].message.content.strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


def interactive_spec(client, extracted, raw_idea):
    """Walk through guided questions per section, return assembled answers."""
    print("\n\033[1mGuided Spec Interview\033[0m")
    print("\033[2mPress Enter to skip a question, Ctrl+C to finish early.\033[0m\n")

    answers = {}
    for section, questions in SECTION_QUESTIONS.items():
        print(f"\033[1m\033[34m── {section.upper().replace('_', ' ')} ──\033[0m")
        section_answers = []
        for q in questions:
            try:
                ans = input(f"  {q}\n  → ").strip()
                if ans:
                    section_answers.append(f"Q: {q}\nA: {ans}")
            except (KeyboardInterrupt, EOFError):
                print("\n")
                break
        if section_answers:
            answers[section] = "\n\n".join(section_answers)
        print()

    return answers


def quick_spec(extracted, raw_idea):
    """Build spec from extracted data only (no interview)."""
    answers = {
        "objective": f"Objective: {extracted.get('objective', raw_idea)}\nUsers: {', '.join(extracted.get('users', []))}\nInputs: {', '.join(extracted.get('inputs', []))}\nOutputs: {', '.join(extracted.get('outputs', []))}",
    }
    if extracted.get("questions"):
        answers["open_questions"] = "Unresolved: " + "; ".join(extracted["questions"])
    return answers


def score_spec(client, answers):
    print_step("SCORE", "computing readiness scores...")
    content = "\n\n".join([f"[{s.upper()}]\n{a}" for s, a in answers.items()])
    resp = client.chat.completions.create(
        model=FAST_MODEL,
        max_tokens=512,
        messages=[
            {"role": "system", "content": "You are CADMUS scoring a product spec. Return ONLY valid JSON with integer scores 0-100 for: clarity, completeness, logic_integrity, edge_case, build_readiness. Also include a 'reasoning' string (1-2 sentences). No markdown."},
            {"role": "user", "content": f"Score this spec:\n\n{content}"}
        ]
    )
    text = resp.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


def generate_export(client, export_type, spec_content):
    prompt = EXPORT_PROMPTS.get(export_type)
    if not prompt:
        print_error(f"Unknown export type: {export_type}")
        print(f"Available: {', '.join(EXPORT_PROMPTS.keys())}")
        sys.exit(1)

    print_step("EXPORT", f"generating {export_type.replace('_', ' ')}...")
    result = []
    stream = client.chat.completions.create(
        model=SMART_MODEL,
        max_tokens=4096,
        stream=True,
        messages=[
            {"role": "system", "content": f"You are CADMUS. {prompt}"},
            {"role": "user", "content": f"Generate from this spec:\n\n{spec_content}"}
        ]
    )
    for chunk in stream:
        text = chunk.choices[0].delta.content or ""
        print(text, end="", flush=True)
        result.append(text)
    print("\n")
    return "".join(result)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CADMUS CLI — turn vague ideas into build-ready specs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cadmus_cli.py "A tool to track oil and gas leases"
  python cadmus_cli.py "A tool to track oil and gas leases" --interview
  python cadmus_cli.py "A tool to track oil and gas leases" --export prd
  python cadmus_cli.py "A tool to track oil and gas leases" --export ai_build_prompt --out prompt.md
  python cadmus_cli.py --exports
        """
    )
    parser.add_argument("idea", nargs="?", help="Raw product idea (quoted string)")
    parser.add_argument("--export", metavar="TYPE", help="Export type to generate")
    parser.add_argument("--out", metavar="FILE", help="Output file (default: stdout)")
    parser.add_argument("--interview", action="store_true", help="Run guided spec interview")
    parser.add_argument("--exports", action="store_true", help="List available export types")
    parser.add_argument("--key", metavar="KEY", help="OpenAI API key (overrides env var)")
    args = parser.parse_args()

    if args.exports:
        print("\nAvailable export types:")
        for k, v in EXPORT_PROMPTS.items():
            print(f"  \033[36m{k:<24}\033[0m {v[:60]}...")
        sys.exit(0)

    if not args.idea:
        parser.print_help()
        sys.exit(1)

    api_key = args.key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print_error("OPENAI_API_KEY not set. Export env var or pass --key YOUR_KEY")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    print_header()

    # Step 1: Extract
    try:
        extracted = extract_idea(client, args.idea)
        print_ok(f"Extracted: {extracted.get('objective', '')[:80]}")
    except Exception as e:
        print_error(f"Extraction failed: {e}")
        sys.exit(1)

    # Step 2: Build spec
    if args.interview:
        answers = interactive_spec(client, extracted, args.idea)
    else:
        answers = quick_spec(extracted, args.idea)

    spec_content = f"RAW IDEA:\n{args.idea}\n\n"
    spec_content += "\n\n".join([f"[{s.upper()}]\n{a}" for s, a in answers.items()])

    # Step 3: Score
    try:
        scores = score_spec(client, answers)
        br = scores.get("build_readiness", 0)
        print(f"  Clarity:          {scores.get('clarity', 0):3d}/100")
        print(f"  Completeness:     {scores.get('completeness', 0):3d}/100")
        print(f"  Logic Integrity:  {scores.get('logic_integrity', 0):3d}/100")
        print(f"  Edge Cases:       {scores.get('edge_case', 0):3d}/100")
        print(f"  Build Readiness:  {br:3d}/100  {score_label(br)}")
        print(f"\n  {scores.get('reasoning', '')}\n")
    except Exception as e:
        print(f"  (scoring error: {e})\n")

    # Step 4: Export (if requested)
    if args.export:
        try:
            output = generate_export(client, args.export, spec_content)
            if args.out:
                with open(args.out, "w") as f:
                    f.write(output)
                print_ok(f"Saved to {args.out}")
            # else already printed via streaming
        except Exception as e:
            print_error(f"Export failed: {e}")
            sys.exit(1)
    else:
        # Print the assembled spec
        print("\n\033[2m━━━ ASSEMBLED SPEC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m")
        print(spec_content)

    print(f"\033[2mGenerated by CADMUS — {datetime.now().strftime('%Y-%m-%d %H:%M')}\033[0m\n")


if __name__ == "__main__":
    main()
