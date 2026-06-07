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
5. Return `BLOCKED` when task annotation is missing, no eligible task exists, or the selected task boundary conflicts with design commitments.

## Output mapping

The workflow routes to `execute-task` only when one task is selected. It routes to progress/blocker handling when the plan returns `BLOCKED`; this adapter does not create a standalone review or debug workflow.
