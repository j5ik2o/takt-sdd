{extends: review-qa}

# Kiro Gap Validation Readiness

## Kiro-specific delta

This instruction is read-only. Inspect requirements and current codebase evidence, but do not write `.kiro/*` artifacts.

## Validation procedure

1. Verify that `.kiro/specs/<feature>/requirements.md` exists and that `spec.json` has reached a requirements-capable phase.
2. If requirements are missing, return `verdict: FAIL` or `verdict: BLOCKED` with `error_category: ARTIFACT_MISSING` or `LIFECYCLE_INCONSISTENT`.
3. Compare requirements against existing implementation evidence.
4. Record existing implementation, missing components, integration points, and recommended next action.
5. Record observed evidence and missing evidence separately in `evidence` and `findings`.
6. If codebase evidence is insufficient, add a finding with `category: "MANUAL_VERIFICATION_REQUIRED"` and do not treat that item as PASS evidence.

## Output mapping

Use the shared `kiro-validation-result` contract. Put stopping reasons in `findings.message` and verified facts in `evidence`.
