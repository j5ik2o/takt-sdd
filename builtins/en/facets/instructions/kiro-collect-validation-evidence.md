---
Full custom skill reason: common evidence helper shared by multiple validation skills, not a direct Kiro skill section adapter
---

{extends: gather-review}

# Kiro Validation Evidence Collection

## Kiro-specific delta

This instruction is read-only. Gather observed evidence and missing evidence without changing repository state.

## Evidence rules

1. Put confirmed command results, inspected files, and checked facts in `evidence`.
2. Put missing evidence in `findings` instead of `evidence`.
3. Use finding `category: "MANUAL_VERIFICATION_REQUIRED"` when a human or external system must confirm a condition.
4. Do not use missing evidence as a reason for a readiness adapter to return `DECISION: GO`.
5. Keep `summary` human-readable only; workflow branching must use the machine fields defined by the consuming readiness adapter.

## Output mapping

Use the shared evidence fields `checked_items`, `findings`, `error_category`, `evidence`, and `summary`. This helper does not choose `DECISION`; the consuming `kiro-validate-*` readiness adapter sets `DECISION: GO`, `DECISION: NO-GO`, or `DECISION: MANUAL_VERIFY_REQUIRED` for workflow branching.
