{extends: validation}

# Kiro Validation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines Kiro validation fields.

## Machine Fields

- `verdict`: one of `PASS`, `FAIL`, `NEEDS_FIX`, `BLOCKED`.
- `DECISION`: optional Kiro skill primary field when produced by implementation validation; one of `GO`, `NO-GO`, `MANUAL_VERIFY_REQUIRED`.
- `scope`: validated workflow, feature, or contract set.
- `checked_items`: array of checked files, commands, or contract names.
- `findings`: array of machine-readable findings with `category`, `severity`, `path`, and `message`.
- `error_category`: optional shared category, including `FEATURE_NOT_FOUND`, `ARTIFACT_MISSING`, `SPEC_JSON_INVALID`, `LIFECYCLE_INCONSISTENT`, `SKILL_SOURCE_MISSING`, `UNSUPPORTED_KIRO_IDENTITY`, `BUILTIN_FACET_NOT_FOUND`, or `FACET_EXTENDS_UNSUPPORTED`.
- `evidence`: command results or inspected facts.
- `summary`: human-readable explanation only; must not be used for workflow branching.

## Branching Rule

Workflow rules must branch on the source Kiro skill primary field when one exists, such as `DECISION`; otherwise branch on `verdict` and `error_category`, not on `summary`.
