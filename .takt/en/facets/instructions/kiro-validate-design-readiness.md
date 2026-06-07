---
extends_skill: kiro-validate-design
extends_skill_section: "## Execution Steps"
---

{extends: review-arch}

# Kiro Design Validation Readiness

## Kiro-specific delta

This instruction is read-only. Inspect `requirements.md`, `design.md`, optional `research.md`, and `spec.json`; do not modify design artifacts.

## Validation procedure

1. Verify that requirements and design artifacts exist and that approvals do not contradict the current phase.
2. Check requirements coverage against the design traceability table.
3. Check Boundary Commitments, Out of Boundary, Allowed Dependencies, and Revalidation Triggers.
4. Check the File Structure Plan against the component mapping.
5. Check validation hooks and repository-local test strategy.
6. If downstream responsibility is absorbed by this design, return `DECISION: NO-GO` with a boundary violation finding.

## Output mapping

Use the shared `kiro-validation-result` contract. Translate the inherited skill's GO/NO-GO readiness determination into an explicit `DECISION: <GO|NO-GO|MANUAL_VERIFY_REQUIRED>` line; do not return a bare GO/NO-GO verdict without the `DECISION` machine field. Always set `DECISION` as the primary workflow-routing field: `GO` for design readiness, `NO-GO` for lifecycle failure or design drift, and `MANUAL_VERIFY_REQUIRED` when evidence cannot be confirmed automatically.
