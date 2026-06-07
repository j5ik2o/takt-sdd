---
extends_skill: kiro-spec-tasks
extends_skill_section: "### Step 3: Review Task Plan"
---

{extends: review-requirements}

# Kiro Spec Tasks Review Instruction

## Kiro-specific delta

Review the draft task plan and task graph before `tasks.md` and lifecycle metadata are finalized. This adapter is read-only and must not write `tasks.md`, update `spec.json`, approve tasks, or set `ready_for_implementation`.

## Review procedure

1. Load `requirements.md`, `design.md`, `spec.json`, any existing `tasks.md` merge context, the draft task plan from the previous step, and task generation rules.
2. Run the task plan review gate from `kiro-spec-tasks` Step 3.
3. Run the task-graph sanity review described in `kiro-spec-tasks` Step 3.5.
4. Return `validation.verdict: "PASS"` only when both reviews pass; include explicit `task plan review PASS` and `task graph sanity review PASS` evidence in the report body.
5. Return `validation.verdict: "NEEDS_FIX"` when findings are local to the task plan and can be repaired without requirements/design changes; include `NEEDS_FIXES` evidence.
6. Return `validation.verdict: "BLOCKED"` when the review exposes a real requirements/design gap or contradiction; include `RETURN_TO_DESIGN` evidence.

## Result mapping

- On pass, report the checked coverage, executability, dependency graph, boundary ownership, and `(P)` marker evidence without changing artifacts.
- On needs-fix or blocked, include concrete findings and keep `tasks.md` and `spec.json` unchanged.
