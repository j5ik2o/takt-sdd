{extends: supervise}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-validate-impl` or `/kiro-validate-impl` and read the resolved `SKILL.md`.
Apply the `## Execution Steps` section from `$kiro-validate-impl` or `/kiro-validate-impl` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Implementation Validation Readiness

## Kiro-specific delta

This instruction is read-only. Validate task completion and evidence; do not execute implementation tasks and do not update `tasks.md` checkboxes.

## Validation procedure

1. Verify that `.kiro/specs/<feature>/tasks.md` exists.
2. Verify that `spec.json.ready_for_implementation` is true before treating implementation validation as eligible.
3. If `tasks.md` is missing, return `DECISION: NO-GO` with `error_category: ARTIFACT_MISSING`.
4. If `ready_for_implementation` is false or lifecycle state blocks implementation validation, return `DECISION: NO-GO` with `error_category: LIFECYCLE_INCONSISTENT`.
5. Check task checkbox state and blocked notes.
6. Compare task completion with test/build evidence and reported verification facts.
7. Separate incomplete work, evidence mismatch, and missing manual checks.
8. Record observed evidence and missing evidence separately in `evidence` and `findings`.
9. If evidence is missing, return `DECISION: MANUAL_VERIFY_REQUIRED`, add a finding with `category: "MANUAL_VERIFICATION_REQUIRED"`, and do not treat that item as verified evidence.

## Output mapping

Use the shared `kiro-validation-result` contract. Always set `DECISION` as the primary workflow-routing field: `GO` only when completed tasks and evidence are consistent, `NO-GO` when implementation validation fails, and `MANUAL_VERIFY_REQUIRED` when evidence cannot be confirmed automatically.
