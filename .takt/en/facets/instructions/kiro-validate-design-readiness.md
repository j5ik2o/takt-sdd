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
6. If downstream responsibility is absorbed by this design, return a boundary violation finding.

## Output mapping

Use the shared `kiro-validation-result` contract. Represent lifecycle failures with `FAIL` or `BLOCKED`; represent fixable design drift with `NEEDS_FIX`.
