---
extends_skill: kiro-spec-tasks
extends_skill_section: "## Execution Steps"
---

{extends: plan}

# Kiro Spec Tasks Instruction

## Kiro-specific delta

Generate `.kiro/specs/<feature>/tasks.md` from approved requirements and design. The success state is `tasks-generated`, with `spec.json` setting `approvals.tasks.generated` to true. Auto-approve mode may also set `approvals.tasks.approved` and `ready_for_implementation` to true. Keep this phase limited to TasksGenerationWorkflow responsibilities.

## Inputs

- `.kiro/specs/<feature>/spec.json` in the `design-generated` phase or a later compatible phase.
- `.kiro/specs/<feature>/requirements.md`.
- `.kiro/specs/<feature>/design.md`.
- Existing `tasks.md` when regenerating or merging task plans.
- `.kiro/settings/templates/specs/tasks.md`.
- Task generation rules from `kiro-spec-generation`, `kiro-spec-lifecycle`, and `kiro-spec-task-annotations`.

## Tasks generation procedure

1. Resolve the canonical feature directory as `.kiro/specs/<feature>/`.
2. Run the requirements/design approval gate before generating task output. If requirements or design are not approved, return `validation.verdict: "BLOCKED"` unless `-y` or `auto-approve` mode is explicitly active.
3. When `-y` or `auto-approve` mode is active, explicitly update `approvals.requirements.approved: true` and `approvals.design.approved: true` as part of the successful tasks phase; do not imply approval silently.
4. Perform task generation from `requirements.md`, `design.md`, `spec.json`, existing `tasks.md`, and `.kiro/settings/templates/specs/tasks.md`.
5. Produce `tasks.md` as an implementation-ready plan. Every executable task must include:
   - observable completion detail in a task detail bullet.
   - numeric requirements in `_Requirements: ..._`.
   - the canonical boundary annotation label `_Boundary:_`.
   - the canonical dependency annotation label `_Depends:_`.
6. Use `_Depends:_ none` when an executable task has no dependency. Use task IDs when dependencies exist.
7. Run task plan review before writing success metadata. The review must check executable task size, observable completion, numeric requirements, hidden prerequisites, and requirement coverage.
8. Run task graph sanity review before writing success metadata. The review must check Boundary annotation coverage, Depends annotation coverage, dependency graph validity, boundary overlap, and `(P)` marker validity.
9. Use `(P)` only when non-overlapping boundary and explicit dependency graph evidence show the task can run independently.
10. If hidden prerequisite, boundary overlap, coverage gap, invalid dependency, or invalid `(P)` marker remains, return `validation.verdict: "BLOCKED"` or `validation.verdict: "NEEDS_FIX"` and do not write the `tasks-generated` success state.
11. If both reviews pass, write `.kiro/specs/<feature>/tasks.md`.
12. Update `.kiro/specs/<feature>/spec.json` in the same successful result:
   - `phase`: `tasks-generated`.
   - `approvals.requirements.approved`: true when approval already existed or explicit auto-approve handling applies.
   - `approvals.design.approved`: true when approval already existed or explicit auto-approve handling applies.
   - `approvals.tasks.generated`: true.
   - `approvals.tasks.approved`: true only after human approval or explicit `auto-approve` mode.
   - `ready_for_implementation`: true only when `approvals.tasks.approved` is true.

## Result mapping

- In draft generation or repair steps, write or update `tasks.md` as a draft artifact for the read-only review step, but do not promote `spec.json` to `tasks-generated`. Return `draft_status: "READY_FOR_REVIEW"` and `review_gate: "PENDING"` when the draft task graph is ready for review.
- On success, return `phase: "tasks"`, `validation.verdict: "PASS"`, `featureName`, and `updatedFiles` containing `tasks.md` and `spec.json`.
- In finalize steps after task plan review and task graph sanity review pass, return `draft_status: "WRITTEN"` and `review_gate: "PASSED"` with the artifact updates.
- In normal mode, a generated `tasks.md` may be reviewable while `ready_for_implementation` remains false until tasks approval exists.
- In auto-approve mode, the same successful result sets tasks approved true and `ready_for_implementation` true.
- On missing requirements, missing design, lifecycle inconsistency, failed requirements/design approval gate, failed task plan review, failed task graph sanity review, hidden prerequisite, boundary overlap, or coverage gap, return `BLOCKED` or `NEEDS_FIX` and keep `spec.json` out of the `tasks-generated` success state.
- Evidence must mention requirements/design approval gate handling, task generation sources, observable completion checks, numeric requirements checks, `_Boundary:_` checks, `_Depends:_` checks, task plan review result, task graph sanity review result, and whether `ready_for_implementation` was updated.
