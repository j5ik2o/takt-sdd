---
extends_skill: kiro-debug
extends_skill_section: "## Outputs"
---

{extends: fix}

# Kiro Debug Adapter

## Kiro-specific delta

Investigate implementation, validation, or review failure for the selected task and return a root-cause-first action. This adapter only decides whether a task is repairable, blocked, or needs human input.

## Debug inputs

- `kiro-task-implementation-result.md`
- `kiro-ai-antipattern-review.md`
- optional `kiro-ai-antipattern-fix.md` only if it exists in the current AI quality gate subworkflow run
- `kiro-task-coding-review.md`
- `kiro-task-architecture-review.md`
- `kiro-task-qa-review.md`
- `kiro-task-testing-review.md`

When the `reviewers` group routes here through `any("needs_fix")`, use the rejected child report perspective, report file, finding refs, selected task refs, and requirement/design refs for root cause analysis. When AI gate routes here through `need_replan`, treat `NEED_REPLAN` / `BLOCKED` / ambiguous AI review evidence as human-confirmation or blocker candidates.

## Output mapping

Return the `## Debug Report` shape from `kiro-debug`.

- `ROOT_CAUSE`: concise evidence-backed cause.
- `CATEGORY`: Kiro debug category.
- `FIX_PLAN`: smallest selected-task repair plan when applicable.
- `VERIFICATION`: command or checklist for the next implementer.
- `NEXT_ACTION`: `RETRY_TASK`, `BLOCK_TASK`, or `STOP_FOR_HUMAN`.
- `retry_eligible`: boolean; required with `NEXT_ACTION` so workflow rules can distinguish retryable and non-retryable failures.
- `CONFIDENCE`: `HIGH`, `MEDIUM`, or `LOW`.
- `NOTES`: context for the next adapter step.

Workflow rules branch on `NEXT_ACTION` and `retry_eligible`. Repetition control stays in `kiro-impl.yaml` `loop_monitors.threshold`.
