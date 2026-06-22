# Kiro Spec Lifecycle Policy

Full custom reason: built-in policies do not define `.kiro/specs/<feature>/spec.json` phase and approval semantics.

## Phase Rules

- `initialized`
  - Required artifacts: `spec.json`, `requirements.md` draft。
  - generated approvals: すべて false。
  - `ready_for_implementation`: false。
- `requirements-generated`
  - Required artifacts: `requirements.md`。
  - `approvals.requirements.generated`: true。
  - `approvals.requirements.approved`: human approval または auto-approve 後だけ true。
- `design-generated`
  - Required artifacts: `requirements.md`, `design.md`。
  - `approvals.requirements.approved`: true。
  - `approvals.design.generated`: true。
  - `approvals.design.approved`: human approval または auto-approve 後だけ true。
- `tasks-generated`
  - Required artifacts: `requirements.md`, `design.md`, `tasks.md`。
  - `approvals.requirements.approved`: true。
  - `approvals.design.approved`: true。
  - `approvals.tasks.generated`: true。
  - `approvals.tasks.approved`: human approval または auto-approve 後だけ true。
  - `ready_for_implementation`: tasks が approved で、上流 readiness gate が implementation を保留していない場合だけ true。

## Auto-Approve

auto-approve mode は同じ phase transition で generated と approved を true にできる。normal mode は明示承認まで approved を false に保つ。

## Revalidation

未知の `phase`、approval field、lifecycle value を導入する場合、下流 workflow が利用する前に shared contract revalidation を必要とする。
