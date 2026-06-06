{extends: gather-review}

# Kiro Validation Evidence Collection

## Kiro-specific delta

This instruction is read-only. Gather observed evidence and missing evidence without changing repository state.

## Evidence rules

1. Put confirmed command results, inspected files, and checked facts in `evidence`.
2. Put missing evidence in `findings` instead of `evidence`.
3. Use finding `category: "MANUAL_VERIFICATION_REQUIRED"` when a human or external system must confirm a condition.
4. Do not use missing evidence as a reason for `PASS`.
5. Keep `summary` human-readable only; workflow branching must use machine fields.

## Output mapping

Use the shared `kiro-validation-result` contract fields: `verdict`, `checked_items`, `findings`, `error_category`, `evidence`, and `summary`.
