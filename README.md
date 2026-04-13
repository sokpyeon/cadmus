# cadmus-spec

CADMUS — AI Spec Engine. Turns vague product ideas into scored, build-ready specifications.

## Install

```bash
pip install cadmus-spec
```

## Requirements

- Python 3.8+
- OpenAI API key (set `OPENAI_API_KEY` env var)

## Usage

### Python API

```python
from cadmus import CadmusEngine, ExportType

engine = CadmusEngine()  # reads OPENAI_API_KEY from env
spec = engine.create_spec("A compliance document tracker for financial services")

print(spec.scores.label)          # BUILD-READY / SOLID / DEVELOPING / WEAK
print(spec.scores.build_readiness) # 0-100

prd = engine.export(spec, ExportType.PRD)
```

### CLI

```bash
cadmus "A risk scoring dashboard for portfolio managers"
cadmus "A trade reconciliation tool" --export engineering_handoff
cadmus "A surveillance alert system" --export ai_build_prompt --out prompt.md
cadmus --exports   # list all export types
```

## Export Types

- `full_spec` — Complete product specification
- `prd` — Product Requirements Document
- `engineering_handoff` — Technical handoff for engineers
- `ai_build_prompt` — Optimised prompt for Claude Code / Cursor
- `phase_plan` — MVP + phased roadmap
- `test_cases` — Comprehensive test plan
- `edge_case_checklist` — Edge case checklist
- `deck_outline` — Pitch deck outline
