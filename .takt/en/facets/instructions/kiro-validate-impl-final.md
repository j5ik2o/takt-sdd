---
extends_skill: kiro-validate-impl
extends_skill_section: "### 4. Generate Report"
---

{extends: supervise}

# Kiro Final Implementation Validation Adapter

## Kiro-specific delta

Run feature-level validation after selected task progress handling. This adapter is read-only and never performs task implementation.

## Output mapping

Return the `kiro-validate-impl` validation report.

- `DECISION`: `GO`, `NO-GO`, or `MANUAL_VERIFY_REQUIRED`.
- `MECHANICAL_RESULTS`: test, static check, and smoke evidence when available.
- `INTEGRATION`, `COVERAGE`, `DESIGN`: feature-level assessment.
- `BLOCKED_TASKS`: blocker impact.

Workflow rules branch on `DECISION`. For a single selected task iteration, `NO-GO` and `MANUAL_VERIFY_REQUIRED` are surfaced as validation evidence rather than silently repaired here. Use `FEATURE_GO` evidence only for feature-level claims.
