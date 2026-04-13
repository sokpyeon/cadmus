from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class ExportType(str, Enum):
    FULL_SPEC = "full_spec"
    PRD = "prd"
    ENGINEERING_HANDOFF = "engineering_handoff"
    AI_BUILD_PROMPT = "ai_build_prompt"
    PHASE_PLAN = "phase_plan"
    TEST_CASES = "test_cases"
    EDGE_CASE_CHECKLIST = "edge_case_checklist"
    DECK_OUTLINE = "deck_outline"


@dataclass
class ExtractedIdea:
    objective: str
    users: List[str] = field(default_factory=list)
    inputs: List[str] = field(default_factory=list)
    outputs: List[str] = field(default_factory=list)
    questions: List[str] = field(default_factory=list)
    raw_idea: str = ""


@dataclass
class SpecScores:
    clarity: int
    completeness: int
    logic_integrity: int
    edge_case: int
    build_readiness: int
    reasoning: str = ""

    @property
    def overall(self) -> float:
        return (
            self.clarity
            + self.completeness
            + self.logic_integrity
            + self.edge_case
            + self.build_readiness
        ) / 5

    @property
    def label(self) -> str:
        s = self.build_readiness
        if s >= 85:
            return "BUILD-READY"
        if s >= 70:
            return "SOLID"
        if s >= 50:
            return "DEVELOPING"
        return "WEAK"


@dataclass
class Spec:
    idea: ExtractedIdea
    answers: dict
    content: str
    scores: Optional[SpecScores] = None
