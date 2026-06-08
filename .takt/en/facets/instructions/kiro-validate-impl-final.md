{extends: supervise}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-validate-impl` or `/kiro-validate-impl` and read the resolved `SKILL.md`.
Apply the `### 4. Generate Report` section from `$kiro-validate-impl` or `/kiro-validate-impl` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Final Implementation Validation Adapter

## Kiro-specific delta

Run feature-level validation after selected task progress handling. This adapter is read-only and never performs task implementation.

## Output mapping

Return the validation report from `$kiro-validate-impl` or `/kiro-validate-impl`.

- `DECISION`: `GO`, `NO-GO`, or `MANUAL_VERIFY_REQUIRED`.
- `MECHANICAL_RESULTS`: test, static check, and smoke evidence when available.
- `INTEGRATION`, `COVERAGE`, `DESIGN`: feature-level assessment.
- `BLOCKED_TASKS`: blocker impact.

Workflow rules branch on `DECISION`. For a single selected task iteration, `NO-GO` and `MANUAL_VERIFY_REQUIRED` are surfaced as validation evidence rather than silently repaired here. Use `FEATURE_GO` evidence only for feature-level claims.
