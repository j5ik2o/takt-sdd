# Kiro Spec Lifecycle Policy

Full custom reason: built-in policies do not define `.kiro/specs/<feature>/spec.json` phase and approval semantics.

## Phase Rules

- `initialized`
  - Required artifacts: `spec.json`, `requirements.md` draft.
  - Generated approvals: all false.
  - `ready_for_implementation`: false.
- `requirements-generated`
  - Required artifacts: `requirements.md`.
  - `approvals.requirements.generated`: true.
  - `approvals.requirements.approved`: true only after human approval or auto-approve.
- `design-generated`
  - Required artifacts: `requirements.md`, `design.md`.
  - `approvals.requirements.approved`: true.
  - `approvals.design.generated`: true.
  - `approvals.design.approved`: true only after human approval or auto-approve.
- `tasks-generated`
  - Required artifacts: `requirements.md`, `design.md`, `tasks.md`.
  - `approvals.requirements.approved`: true.
  - `approvals.design.approved`: true.
  - `approvals.tasks.generated`: true.
  - `approvals.tasks.approved`: true only after human approval or auto-approve.
  - `ready_for_implementation`: true only when tasks are approved and no upstream readiness gate is holding back implementation.

## Auto-Approve

Auto-approve mode may set generated and approved to true in the same phase transition. Normal mode must keep approved false until explicit approval.

## Revalidation

Unknown `phase`, approval field, or lifecycle value requires shared contract revalidation before downstream workflows consume it.
