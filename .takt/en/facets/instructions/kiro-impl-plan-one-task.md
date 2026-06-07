---
extends_skill: kiro-impl
extends_skill_section: "## Step 2: Select Tasks & Determine Mode"
---

{extends: plan}

# Kiro One Task Planning Adapter

## Kiro-specific delta

Plan exactly one task for this TAKT iteration. This facet maps `kiro-impl` task selection into workflow state; it does not implement code and does not update `tasks.md`.

## Input artifacts

- `.kiro/specs/<feature>/spec.json` with `ready_for_implementation`.
- `.kiro/specs/<feature>/requirements.md`, `design.md`, and `tasks.md`.
- Task annotations `_Boundary:_`, `_Depends:_`, numeric requirement coverage, blocker notes, and checkbox state.
- Read-only readiness signal from status validation when available.

## Planning rules

1. Stop before edit if `ready_for_implementation` is not true, approvals are incomplete, or required artifacts are missing.
2. Select the first unchecked one task whose `_Depends:_` entries are complete and whose blocker notes do not stop execution.
3. Treat `_Depends:_ none` as an empty dependency set.
4. Include `_Boundary:_`, `_Depends:_`, requirement numbers, selected task text, forbidden adjacent scope, and validation command hints in the implementation plan.
5. Return `STATUS: READY_FOR_REVIEW` when exactly one selected task has a valid implementation plan.
6. Return `STATUS: BLOCKED` with `selected_task` and `blocker_note_required: true` when an unchecked task is blocked by missing task annotation or a boundary conflict.
7. Return `STATUS: BLOCKED` without `selected_task` when no unchecked task is eligible or feature readiness failed.

## Output mapping

The workflow routes to `execute-task` only when `STATUS: READY_FOR_REVIEW` and exactly one task is selected. It routes selected-task `STATUS: BLOCKED` results to progress/blocker handling; readiness-level `STATUS: BLOCKED` stops without writing `tasks.md`. This adapter does not create a standalone review or debug workflow.
