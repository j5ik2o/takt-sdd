{extends: validation}

# Kiro Status Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and adds Kiro status fields only.

## Machine Fields

- `status`: one of `FOUND`, `MISSING`, `INVALID`.
- `feature`: canonical feature name.
- `phase`: current `spec.json.phase`, or `null` when status is `MISSING`.
- `approvals`: object with `requirements`, `design`, and `tasks` generated/approved booleans.
- `readiness`: one of `READY`, `NOT_READY`, `INCONSISTENT`.
- `ready_for_implementation`: boolean copied from `spec.json` when available.
- `error_category`: optional shared category such as `FEATURE_NOT_FOUND`, `ARTIFACT_MISSING`, `SPEC_JSON_INVALID`, or `LIFECYCLE_INCONSISTENT`.
- `evidence`: array of checked artifact paths and state facts.
- `summary`: human-readable explanation that must not be used for workflow branching.

## Branching Rule

Workflow rules must branch on `status`, `readiness`, and `error_category`, not on `summary`.
