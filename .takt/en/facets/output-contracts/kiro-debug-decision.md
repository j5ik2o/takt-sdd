{extends: validation}

# Kiro Debug Decision Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines debug decision fields.

## Machine Fields

- `NEXT_ACTION`: one of `RETRY_TASK`, `BLOCK_TASK`, `STOP_FOR_HUMAN`.
- `decision`: optional supplement mirroring `NEXT_ACTION`; workflow branching must use `NEXT_ACTION`.
- `root_cause`: concise machine-readable root cause.
- `failure_category`: validation, review, dependency, environment, artifact, or unknown.
- `retry_eligible`: boolean.
- `abort_reason`: required when `NEXT_ACTION` is `STOP_FOR_HUMAN`.
- `affected_task_refs`: task references affected by the decision.
- `evidence`: failure output, file paths, or inspected state.
- `summary`: human-readable debug explanation only; must not be used for workflow branching.

## Branching Rule

Workflow rules must branch on `NEXT_ACTION` and `retry_eligible`, not on `decision` or `summary`.
