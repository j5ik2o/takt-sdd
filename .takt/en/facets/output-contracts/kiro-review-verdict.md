{extends: validation}

# Kiro Review Verdict Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines review verdict fields.

## Machine Fields

- `verdict`: one of `GO`, `NO_GO`.
- `review_scope`: selected task, feature, or contract boundary under review.
- `findings`: array of actionable findings.
- `requirement_refs`: array of original requirement numbers.
- `task_refs`: array of original task numbers or task labels.
- `boundary_violations`: array of cross-boundary responsibility issues.
- `evidence`: inspected files, command results, or design references.
- `summary`: human-readable review summary only; must not be used for workflow branching.

## Branching Rule

Workflow rules must branch on `verdict`, not on `summary`.
