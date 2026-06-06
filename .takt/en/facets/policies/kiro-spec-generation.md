# Kiro Spec Generation Policy

Full custom reason: built-in policies do not define Kiro `.kiro/specs/<feature>` phase gates, artifact write rules, or `spec.json` metadata updates.

## Scope

- Apply this policy only to standalone `kiro-spec-init`, `kiro-spec-requirements`, `kiro-spec-design`, `kiro-spec-tasks`, and `kiro-spec-quick` phase steps.
- Read and write artifacts only under `.kiro/specs/<feature>/`.
- Do not absorb roadmap, OpenSpec, discovery, batch orchestration, or implementation execution behavior into this policy.

## Phase Gate

- Before each phase, resolve `featureName` to `.kiro/specs/<feature>` and inspect the current `spec.json` lifecycle state.
- `initialized` may be produced only by init after `spec.json` and draft `requirements.md` can be written consistently.
- `requirements-generated` requires an initialized feature and a non-blocked `requirements.md` generation result.
- `design-generated` requires generated requirements and either prior human approval or explicit auto-approve handling for requirements.
- `tasks-generated` requires generated design and either prior human approval or explicit auto-approve handling for requirements and design.
- If a phase gate fails, return a blocking result and do not advance `phase`, approvals, or `ready_for_implementation`.

## Artifact Write

- Write only the artifact owned by the current phase: `spec.json` and draft `requirements.md` for init, `requirements.md` for requirements, `design.md` and optional `research.md` for design, and `tasks.md` for tasks.
- Preserve `brief.md` as input context; do not treat it as an implementation artifact.
- Do not update files outside `.kiro/specs/<feature>` as a success condition for spec generation.
- If an artifact cannot be written safely, return `BLOCKED` or `NEEDS_FIX` with the target path in `updatedFiles` omitted.

## Metadata Update

- Update `spec.json` in the same phase result as the successful artifact write.
- Set `phase` to `initialized`, `requirements-generated`, `design-generated`, or `tasks-generated` only after the corresponding artifact write and review gate succeed.
- Update `approvals.*.generated` for the completed phase according to the shared Kiro spec lifecycle policy.
- Set `approvals.*.approved` only after human approval or explicit `auto-approve` mode.
- Set `ready_for_implementation` to true only when `phase` is `tasks-generated` and tasks are approved.

## Blocking Result

- Return `BLOCKED` when ambiguity, lifecycle inconsistency, missing required input, feature name conflict, or review gate failure prevents a safe phase transition.
- Return `NEEDS_FIX` when a generated artifact exists but must be corrected before the lifecycle can advance.
- Include `blockingReason` for every `BLOCKED` result and keep successful metadata unchanged.
- Include `nextAction` that names the next approval, correction, or phase command the caller should run.
