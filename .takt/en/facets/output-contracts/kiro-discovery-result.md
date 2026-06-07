{extends: validation}

# Kiro Discovery Result Output Contract

## Machine Fields

- `actionPath`: one of `EXISTING_SPEC_UPDATE`, `DIRECT_IMPLEMENTATION`, `SINGLE_SPEC`, `MULTI_SPEC`, or `MIXED_DECOMPOSITION`.
- `reason`: concise routing rationale.
- `createdFiles`: array of repository-relative paths created or updated by discovery.
- `plannedFiles`: array of repository-relative paths that downstream workflows should expect.
- `nextAction`: next command or human action, such as `kiro-spec-init`, `kiro-spec-batch`, `kiro-spec-requirements`, or direct implementation.
- `blockingReason`: required when discovery cannot safely select an action path or write artifacts.
- `awarenessOnlyItems`: existing spec updates or direct implementation candidates that must not enter batch dependency waves.

## Result Rules

- `EXISTING_SPEC_UPDATE` and `DIRECT_IMPLEMENTATION` normally have an empty `createdFiles` array and a concrete `nextAction`.
- `SINGLE_SPEC` must include the target feature `brief.md` in `createdFiles` or `plannedFiles`.
- `MULTI_SPEC` and `MIXED_DECOMPOSITION` must include `.kiro/steering/roadmap.md` plus every new spec `brief.md`.
- `MIXED_DECOMPOSITION` must keep existing spec updates and direct implementation candidates in `awarenessOnlyItems`.
- When `blockingReason` is present, downstream spec generation must not start.
