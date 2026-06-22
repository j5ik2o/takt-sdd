# Kiro Artifact Operations Policy

Full custom reason: built-in policies do not define `.kiro/steering` and `.kiro/specs/<feature>` artifact lifecycle boundaries.

## Steering Reads

- Read `.kiro/steering/roadmap.md` when workflow routing, dependency order, or batch context needs project memory.
- Read existing `.kiro/steering/*.md` files only when the workflow boundary needs them.
- Missing optional steering files are not `ARTIFACT_MISSING`.

## Feature Resolution

- Resolve a feature by `.kiro/specs/<feature>/`.
- `brief.md` is discovery context and is optional after spec initialization.
- `spec.json` is required once the feature has been initialized.
- Missing feature directory is `FEATURE_NOT_FOUND`.

## Phase Artifacts

- `requirements-generated` requires `requirements.md`.
- `design-generated` requires `requirements.md` and `design.md`; `research.md` is optional supplemental input.
- `tasks-generated` requires `requirements.md`, `design.md`, `tasks.md`, and `spec.json`.
- Missing required artifacts are `ARTIFACT_MISSING`.
- Invalid or unreadable `spec.json` is `SPEC_JSON_INVALID`.
- Phase, approvals, and artifact presence mismatch is `LIFECYCLE_INCONSISTENT`.

## Boundary

OpenSpec artifacts under `openspec/` are not part of the `.kiro/*` artifact contract.
