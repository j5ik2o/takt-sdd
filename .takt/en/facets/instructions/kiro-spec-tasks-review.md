---
extends_skill: kiro-spec-tasks
extends_skill_section: "### Step 3: Review Task Plan"
extends_skill_additional_section: "### Step 3.5: Run Task-Graph Sanity Review"
---

{extends: review-requirements}

# Kiro Spec Tasks Review Instruction

## Kiro-specific delta

Review the draft task plan and task graph before `tasks.md` and lifecycle metadata are finalized. This adapter is read-only and must not write `tasks.md`, update `spec.json`, approve tasks, or set `ready_for_implementation`.

## Review procedure

1. Load `requirements.md`, `design.md`, `spec.json`, any existing `tasks.md` merge context, the draft task plan from the previous step, and task generation rules.
2. Run the task plan review gate from `kiro-spec-tasks` Step 3.
3. Run the task-graph sanity review described in `kiro-spec-tasks` Step 3.5.
4. Return `task_plan_review: "PASS"` and `task_graph_sanity_review: "PASS"` only when both reviews pass.
5. Return `NEEDS_FIXES` in the relevant review field when findings are local to the task plan and can be repaired without requirements/design changes.
6. Return `RETURN_TO_DESIGN` in the relevant review field when the review exposes a real requirements/design gap or contradiction.

## Result mapping

- On pass, report the checked coverage, executability, dependency graph, boundary ownership, and `(P)` marker evidence without changing artifacts.
- On needs-fix or blocked, include concrete findings and keep `tasks.md` and `spec.json` unchanged.
