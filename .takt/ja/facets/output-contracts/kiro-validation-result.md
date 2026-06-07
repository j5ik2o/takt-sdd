{extends: validation}

# Kiro Validation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines Kiro validation fields.

## Machine Fields

- `DECISION`: Kiro validation の必須 primary field。`GO`, `NO-GO`, `MANUAL_VERIFY_REQUIRED` のいずれか。
- `verdict`: 継承元 tooling が返す場合だけ使う補助的な validation value。`PASS`, `FAIL`, `NEEDS_FIX`, `BLOCKED` のいずれか。workflow routing には使わない。
- `scope`: 検証対象の workflow、feature、または contract set。
- `checked_items`: 確認した file、command、contract name の配列。
- `findings`: `category`、`severity`、`path`、`message` を持つ machine-readable finding の配列。
- `error_category`: 必要に応じて `FEATURE_NOT_FOUND`, `ARTIFACT_MISSING`, `SPEC_JSON_INVALID`, `LIFECYCLE_INCONSISTENT`, `SKILL_SOURCE_MISSING`, `UNSUPPORTED_KIRO_IDENTITY`, `BUILTIN_FACET_NOT_FOUND`, `FACET_EXTENDS_UNSUPPORTED` などを入れる。
- `evidence`: command result または確認済み fact。
- `summary`: 人間向け説明のみ。workflow branching に使ってはならない。

## Branching Rule

Kiro validation workflow の rule は `DECISION` で分岐し、`verdict`、`error_category`、`summary` では分岐しない。
