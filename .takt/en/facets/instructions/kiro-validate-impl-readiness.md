---
extends_skill: kiro-validate-impl
extends_skill_section: "### 3. Execute Integration Validation"
---

{extends: supervise}

# Kiro Implementation Validation Readiness

## Kiro-specific delta

This instruction is read-only. Validate task completion and evidence; do not execute implementation tasks and do not update `tasks.md` checkboxes.

## Validation procedure

1. Verify that `.kiro/specs/<feature>/tasks.md` exists.
2. Verify that `spec.json.ready_for_implementation` is true before treating implementation validation as eligible.
3. If `tasks.md` is missing, return `verdict: FAIL` with `error_category: ARTIFACT_MISSING`.
4. If `ready_for_implementation` is false or lifecycle state blocks implementation validation, return `verdict: BLOCKED` with `error_category: LIFECYCLE_INCONSISTENT`.
5. Check task checkbox state and blocked notes.
6. Compare task completion with test/build evidence and reported verification facts.
7. Separate incomplete work, evidence mismatch, and missing manual checks.
8. Record observed evidence and missing evidence separately in `evidence` and `findings`.
9. If evidence is missing, add a finding with `category: "MANUAL_VERIFICATION_REQUIRED"` and do not treat that item as PASS evidence.

## Output mapping

Use the shared `kiro-validation-result` contract. Return `PASS` only when completed tasks and evidence are consistent.
