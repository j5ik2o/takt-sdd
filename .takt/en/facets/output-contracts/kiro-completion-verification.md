{extends: validation}

# Kiro Completion Verification Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines completion verification fields.

## Machine Fields

- `verdict`: one of `COMPLETE`, `INCOMPLETE`, `BLOCKED`.
- `completed_task_refs`: task references that can be marked complete.
- `remaining_work`: array of missing evidence, open findings, or unfinished work.
- `verification_evidence`: test, build, review, and manual verification facts.
- `blocked_reason`: required when `verdict` is `BLOCKED`.
- `safe_to_update_progress`: boolean; true only when `verdict` is `COMPLETE`.
- `summary`: human-readable completion explanation only; must not be used for workflow branching.

## Branching Rule

Workflow rules must branch on `verdict` and `safe_to_update_progress`, not on `summary`.
