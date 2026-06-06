{extends: gather-review}

# Kiro Spec Status Reporting

## Kiro-specific delta

This instruction is read-only. Inspect `.kiro/specs/<feature>/` and `.kiro/steering/` only as evidence sources; do not create, update, or repair artifacts.

## Status checks

1. Resolve the target feature directory under `.kiro/specs/<feature>/`.
2. If `spec.json` is missing, return `status: MISSING`, `readiness: NOT_READY`, and `error_category: FEATURE_NOT_FOUND`.
3. If `spec.json` is unreadable or invalid JSON, return `status: INVALID`, `readiness: INCONSISTENT`, and `error_category: SPEC_JSON_INVALID`.
4. Read valid `spec.json`, set `status: FOUND`, and report `phase`, `approvals`, and `ready_for_implementation`.
5. Check phase artifact consistency:
   - `initialized` requires a `requirements.md` draft.
   - `requirements-generated` requires `requirements.md`.
   - `design-generated` requires `requirements.md` and `design.md`.
   - `tasks-generated` requires `requirements.md`, `design.md`, and `tasks.md`.
6. Map missing phase artifacts to `error_category: ARTIFACT_MISSING`.
7. Map contradictory phase and approval state to `error_category: LIFECYCLE_INCONSISTENT`.
8. Set `readiness: READY` only when `status: FOUND`, all artifacts required by the current phase exist, and `ready_for_implementation` is true.
9. Set `readiness: NOT_READY` when the feature exists but the current phase or approvals are still incomplete without an inconsistency.
10. Set `readiness: INCONSISTENT` when lifecycle or artifact state contradicts `spec.json`.

## Output mapping

Use the shared `kiro-status` contract. Keep machine fields separate from `summary`; workflow rules must not branch on prose.
