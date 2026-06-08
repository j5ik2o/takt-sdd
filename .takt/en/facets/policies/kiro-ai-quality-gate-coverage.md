# Kiro AI Quality Gate Coverage Policy

Full custom reason: upstream Kiro skills do not define TAKT-specific AI quality gate coverage categories, caller eligibility, or roadmap marker semantics.

## Canonical Inventory

- The workflow-by-workflow inventory is machine-readable and lives in `scripts/kiro-ai-quality-gate-contracts.mjs`.
- This policy explains category semantics and operator decision criteria only.
- Do not duplicate the per-workflow inventory table in this policy. Keep one canonical classification source.

## Category Semantics

- `existing_gate_coverage`: the workflow already owns or calls an approved AI quality gate.
- `generation_scoped_gate_required`: the workflow generates or repairs spec artifacts that proceed to domain review or lifecycle promotion.
- `orchestration_decision_required`: the workflow writes planning or coordination artifacts and needs an explicit maintainer decision before any AI review or fix loop is added.
- `orchestration_delegated`: artifact-level AI quality review belongs to adjacent generation workflows rather than the orchestration workflow itself.
- `read_only_out_of_scope`: the workflow only reads, validates, or reports state and must not gain edit-capable AI fix behavior.
- `intentionally_not_applicable`: the workflow has no stable generated artifact review boundary for AI quality gate insertion.
- `maintainer_decision_required`: available evidence is insufficient to classify the workflow as covered or intentionally out of scope.

## Eligibility Rules

- Add an AI quality gate only where generated or repaired artifacts proceed to domain-specific review or finalization.
- Keep read-only workflows read-only. Do not add repair, debug, edit, or nested workflow behavior to make coverage look complete.
- Treat orchestration workflows as explicit design decisions, not automatic gate targets.
- A `roadmap checkbox` marks spec generation state only. It is not implementation progress evidence and must not drive coverage classification.
- If a new Kiro workflow cannot be classified from its artifact boundary and operator-visible responsibility, return `maintainer_decision_required`.
