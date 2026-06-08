---
extends_skill: kiro-spec-batch
extends_skill_section: "## Step 2: Build Dependency Waves"
---

{extends: supervise}

# Kiro Spec Batch Instruction

## Kiro-specific delta

Run `kiro-spec-batch` as a dependency-wave controller for `.kiro/steering/roadmap.md`. This adapter maps roadmap parsing, wave planning, dynamic subagent dispatch, feature result aggregation, and generation workflow delegation into TAKT step outputs. It must not duplicate requirements/design/tasks generation rules owned by `kiro-spec-generation-workflows`.

## Inputs

- `.kiro/steering/roadmap.md` with `## Specs (dependency order)`.
- Optional awareness-only sections: `## Existing Spec Updates` and `## Direct Implementation Candidates`.
- `.kiro/specs/<feature>/brief.md` for every spec-pending batch feature.
- `kiro-spec-generation-workflows` phase contract and lifecycle result fields.

## Wave Planning

- Parse spec-pending entries and skipped spec-ready entries from `## Specs (dependency order)`.
- Treat roadmap `[x]` as a spec ready marker, not as implementation completion or `tasks.md` checkbox completion.
- Build strict dependency waves. A feature can enter a wave only when every dependency is spec ready or belongs to an earlier wave.
- Do not skip solely because `tasks.md` exists. Confirm readiness evidence from `spec.json.phase == "tasks-generated"`, requirements/design/tasks approvals, `ready_for_implementation == true`, and required artifact existence.
- Report missing dependency, circular dependency, missing `brief.md`, and unknown readiness markers before worker dispatch.

## Dynamic Worker Dispatch

- Use the `dispatch-wave` step as the single dynamic subagent dispatch controller.
- Pass each same-wave worker: feature name, description, dependencies, brief path, auto-approve mode, expected generation phases, and worker output contract.
- Workers use `kiro-spec-generation-workflows` for init, requirements, design, and tasks. Do not shell out with `takt -w`, use `workflow_call`, or restart another workflow.
- Keep worker writes scoped to `.kiro/specs/<feature>/`.

## Feature Result Aggregation

- Return one feature result per worker with `feature`, `status`, `generatedArtifacts`, `blockingReason`, and `nextAction`.
- Preserve success and failure results for the same wave.
- Do not start a later wave until every worker in the current wave has returned a result.
