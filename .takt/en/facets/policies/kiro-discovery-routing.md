{extends: research}

# Kiro Discovery Routing Policy

## Scope

Use this policy only for `kiro-discovery` action path routing. It classifies a user work request and records whether discovery should stop, create `brief.md`, update `.kiro/steering/roadmap.md`, or return a blocking clarification.

## Action Path Enum

- `EXISTING_SPEC_UPDATE`: the request fits an existing `.kiro/specs/<feature>` boundary.
- `DIRECT_IMPLEMENTATION`: the request is a small fix, configuration change, refactor, or documentation update that does not need a new spec.
- `SINGLE_SPEC`: the request is a new boundary-worthy feature that fits one spec.
- `MULTI_SPEC`: the request must be decomposed into multiple new specs.
- `MIXED_DECOMPOSITION`: the request contains at least one new spec plus existing-spec updates or direct implementation candidates.

## Routing Rules

- `EXISTING_SPEC_UPDATE` and `DIRECT_IMPLEMENTATION` must not write new spec generation artifacts. Return `nextAction` that points to the existing spec update or direct implementation path.
- `SINGLE_SPEC`, `MULTI_SPEC`, and `MIXED_DECOMPOSITION` must produce `brief.md` for every new spec candidate.
- `MULTI_SPEC` and `MIXED_DECOMPOSITION` must create or update `.kiro/steering/roadmap.md` with `## Specs (dependency order)`.
- `Existing Spec Updates` and `Direct Implementation Candidates` in roadmap are awareness-only sections. They are not dependency-wave inputs for `kiro-spec-batch`.
- If action path, dependency, or boundary ownership is ambiguous, return `blockingReason` and stop without guessing.

## Machine Fields

- `actionPath`: one of the action path enum values.
- `reason`: concise machine-readable routing rationale.
- `createdFiles`: repository-relative files that discovery wrote or plans to write.
- `nextAction`: next command or human action.
- `blockingReason`: required when routing cannot safely continue.
