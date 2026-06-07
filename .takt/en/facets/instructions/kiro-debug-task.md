---
extends_skill: kiro-debug
extends_skill_section: "## Outputs"
---

{extends: fix}

# Kiro Debug Adapter

## Kiro-specific delta

Investigate implementation, validation, or review failure for the selected task and return a root-cause-first action. This adapter only decides whether a task is repairable, blocked, or needs human input.

## Output mapping

Return the `## Debug Report` shape from `kiro-debug`.

- `ROOT_CAUSE`: concise evidence-backed cause.
- `CATEGORY`: Kiro debug category.
- `FIX_PLAN`: smallest selected-task repair plan when applicable.
- `VERIFICATION`: command or checklist for the next implementer.
- `NEXT_ACTION`: `RETRY_TASK`, `BLOCK_TASK`, or `STOP_FOR_HUMAN`.
- `CONFIDENCE`: `HIGH`, `MEDIUM`, or `LOW`.
- `NOTES`: context for the next adapter step.

Workflow rules branch on `NEXT_ACTION`. Repetition control stays in `kiro-impl.yaml` `loop_monitors.threshold`.
