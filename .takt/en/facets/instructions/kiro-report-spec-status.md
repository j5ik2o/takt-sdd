{extends: gather-review}

# Kiro Spec Status Reporting

## Kiro-specific delta

This instruction is read-only. Inspect `.kiro/specs/<feature>/` and `.kiro/steering/` only as evidence sources; do not create, update, or repair artifacts.

## Status checks

1. Resolve the target feature directory under `.kiro/specs/<feature>/`.
2. If `spec.json` is missing, return `status: MISSING`, `readiness: NOT_READY`, and `error_category: FEATURE_NOT_FOUND`.
3. Read `spec.json` and report `phase`, `approvals`, and `ready_for_implementation`.
4. Check phase artifact consistency:
   - `requirements-generated` requires `requirements.md`.
   - `design-generated` requires `requirements.md` and `design.md`.
   - `tasks-generated` requires `requirements.md`, `design.md`, and `tasks.md`.
5. Map missing phase artifacts to `error_category: ARTIFACT_MISSING`.
6. Map contradictory phase and approval state to `error_category: LIFECYCLE_INCONSISTENT`.
7. Set `readiness: READY` only when `status: FOUND`, all artifacts required by the current phase exist, and `ready_for_implementation` is true.
8. Set `readiness: NOT_READY` when the feature exists but the current phase or approvals are still incomplete without an inconsistency.
9. Set `readiness: INCONSISTENT` when lifecycle or artifact state contradicts `spec.json`.

## Output mapping

Use the shared `kiro-status` contract. Keep machine fields separate from `summary`; workflow rules must not branch on prose.
