{extends: plan}

# Kiro Spec Quick Instruction

## Kiro-specific delta

Compose the Kiro spec generation phases inside one workflow. The quick path runs `quick-init`, `quick-requirements`, `quick-design`, `quick-tasks`, and `quick-sanity-review` in order, using the same standalone workflow instruction, policy, and output contract basenames for each phase. Do not delegate to another workflow runner.

## Inputs

- Invocation feature description or feature name.
- Optional `.kiro/specs/<feature>/brief.md`.
- Existing `.kiro/specs/<feature>/spec.json`, `requirements.md`, `design.md`, `research.md`, and `tasks.md` when a phase resumes.
- The requested mode: `automatic mode` or `interactive mode`.
- Explicit `phase approval` decisions when running in interactive mode.
- Explicit `auto-approve` mode when the caller requests fast-track approval semantics.

## Quick composition procedure

1. Run `quick-init` with the `kiro-spec-init` standalone workflow instruction, `kiro-spec-generation` policy, and `kiro-spec-generation-result` output contract.
2. Run `quick-requirements` with the `kiro-spec-requirements` standalone workflow instruction, `kiro-spec-generation` policy, and `kiro-spec-generation-result` output contract.
3. Run `quick-design` with the `kiro-spec-design` standalone workflow instruction, `kiro-spec-generation` policy, and `kiro-spec-generation-result` output contract.
4. Run `quick-tasks` with the `kiro-spec-tasks` standalone workflow instruction, `kiro-spec-generation` and `kiro-spec-task-annotations` policies, and `kiro-spec-generation-result` output contract.
5. Run `quick-sanity-review` after tasks generation and use the `kiro-spec-sanity-review` output contract.

## Mode behavior

- In `automatic mode`, continue from `quick-init` to `quick-requirements`, `quick-design`, `quick-tasks`, and `quick-sanity-review` without stopping for user approval between successful phases.
- In `interactive mode`, require explicit `phase approval` before moving from init to requirements, from requirements to design, and from design to tasks. If approval is missing or denied, stop and report the next approval required.
- Design and tasks phases use the same auto-approve semantics as their standalone workflow contracts. Design may set `approvals.requirements.approved: true` only when `-y` or `auto-approve` is active. Tasks may set `approvals.requirements.approved: true`, `approvals.design.approved: true`, `approvals.tasks.approved: true`, and `ready_for_implementation: true` only under the same explicit semantics.

## Completion gate

- `quick-sanity-review` checks requirements, design, and tasks for coherence, hidden prerequisite drift, and task annotation coverage.
- `verdict PASS` is the only sanity review result that allows quick workflow completion.
- `NEEDS_FIX` routes to the reported `fix_targets`.
- `BLOCKED` stops completion and reports `blockingReason`.
- The quick path must not call discovery, batch, or implementation execution. It only composes the local spec generation phase contracts.

## Result mapping

- On completion, return `phase: "tasks"`, `validation.verdict: "PASS"`, `ready_for_implementation` according to the tasks phase auto-approve result, and evidence for `quick-completion`.
- On any phase failure, return the phase output from the failed standalone contract and do not skip ahead.
- Evidence must list the five quick steps, the selected mode, every phase approval decision in interactive mode, the auto-approve handling for design/tasks, the final sanity review `verdict`, and that no discovery, batch, or implementation execution was called.
