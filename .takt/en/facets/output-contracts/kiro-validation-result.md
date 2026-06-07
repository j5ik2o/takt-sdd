{extends: validation}

# Kiro Validation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines Kiro validation fields.

## Machine Fields

- `DECISION`: required Kiro validation primary field; one of `GO`, `NO-GO`, `MANUAL_VERIFY_REQUIRED`.
- `verdict`: optional supporting validation value when inherited tooling also emits one; one of `PASS`, `FAIL`, `NEEDS_FIX`, `BLOCKED`; not used for workflow routing.
- `scope`: validated workflow, feature, or contract set.
- `checked_items`: array of checked files, commands, or contract names.
- `findings`: array of machine-readable findings with `category`, `severity`, `path`, and `message`.
- `error_category`: optional shared category, including `FEATURE_NOT_FOUND`, `ARTIFACT_MISSING`, `SPEC_JSON_INVALID`, `LIFECYCLE_INCONSISTENT`, `SKILL_SOURCE_MISSING`, `UNSUPPORTED_KIRO_IDENTITY`, `BUILTIN_FACET_NOT_FOUND`, or `FACET_EXTENDS_UNSUPPORTED`.
- `evidence`: command results or inspected facts.
- `summary`: human-readable explanation only; must not be used for workflow branching.

## Branching Rule

Workflow rules for Kiro validation workflows must branch on `DECISION`, not on `verdict`, `error_category`, or `summary`.
