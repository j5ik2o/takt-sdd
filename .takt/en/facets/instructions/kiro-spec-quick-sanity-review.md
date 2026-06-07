---
extends_skill: kiro-spec-quick
extends_skill_section: "#### Final Sanity Review"
---

{extends: review-qa}

# Kiro Spec Quick Sanity Review Instruction

## Kiro-specific delta

Review the already completed quick path. This instruction is used only by the final `quick-sanity-review` step after `quick-init`, `quick-requirements`, `quick-design`, and `quick-tasks` have produced their phase results. Do not rerun earlier phases, do not write artifacts, and do not delegate to another workflow runner.

## Inputs

- The completed `quick-init`, `quick-requirements`, `quick-design`, and `quick-tasks` phase results.
- `.kiro/specs/<feature>/spec.json`, `requirements.md`, `design.md`, `research.md`, and `tasks.md`.
- The selected `automatic mode` or `interactive mode`.
- Recorded `phase approval` decisions when interactive mode was used.
- The explicit `auto-approve` mode used by design/tasks, including the same auto-approve semantics as standalone phases.

## Final sanity review procedure

1. Confirm the quick path advanced in this order: `quick-init`, `quick-requirements`, `quick-design`, `quick-tasks`, then `quick-sanity-review`.
2. Confirm each completed phase used the same standalone workflow instruction, policy, output contract basename, lifecycle semantics, and same auto-approve semantics as its standalone phase contract.
3. Confirm requirements, design, and tasks are coherent:
   - requirements keep EARS and numeric requirement IDs after requirements generation.
   - design records required boundary, file structure, and traceability sections.
   - tasks include observable completion, numeric requirement coverage, `_Boundary:_`, and `_Depends:_` annotations.
4. Confirm `quick-tasks` preserves both standalone success paths:
   - explicit `auto-approve` may set `approvals.tasks.approved: true` and `ready_for_implementation: true`.
   - `not auto-approve` may proceed to sanity review after `tasks-generated`, task plan review PASS, and task graph sanity review PASS without requiring ready state.
5. Report `NEEDS_FIX` when coherence, hidden prerequisite, task annotation, or phase parity drift remains.
6. Report `BLOCKED` when a required phase result or required artifact is missing.

## Completion gate

- `verdict PASS` is the only result that allows quick-completion.
- `NEEDS_FIX` must include `fix_targets`.
- `BLOCKED` must include `blockingReason` and `fix_targets`.
- The quick path must not call discovery, batch, or implementation execution.

## Result mapping

- On pass, return the `kiro-spec-sanity-review` output contract with `verdict: "PASS"` and evidence for `quick-completion`.
- On needs-fix, return `verdict: "NEEDS_FIX"` with concrete `fix_targets` for requirements, design, or tasks.
- On blocked, return `verdict: "BLOCKED"` with the missing phase result, missing artifact, or unsafe boundary as `blockingReason`, plus `fix_targets` for the blocked correction target.
