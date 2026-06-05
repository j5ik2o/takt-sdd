{extends: validation}

# Kiro Validation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines Kiro validation fields.

## Machine Fields

- `verdict`: `PASS`, `FAIL`, `NEEDS_FIX`, `BLOCKED` のいずれか。
- `scope`: 検証対象の workflow、feature、または contract set。
- `checked_items`: 確認した file、command、contract name の配列。
- `findings`: `category`、`severity`、`path`、`message` を持つ machine-readable finding の配列。
- `error_category`: 必要に応じて `FEATURE_NOT_FOUND`, `ARTIFACT_MISSING`, `SPEC_JSON_INVALID`, `LIFECYCLE_INCONSISTENT`, `SKILL_SOURCE_MISSING`, `UNSUPPORTED_KIRO_IDENTITY`, `BUILTIN_FACET_NOT_FOUND`, `FACET_EXTENDS_UNSUPPORTED` などを入れる。
- `evidence`: command result または確認済み fact。
- `summary`: 人間向け説明のみ。

## Branching Rule

workflow rule は `verdict` と `error_category` を参照して分岐する。
