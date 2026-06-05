{extends: validation}

# Kiro Status Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and adds Kiro status fields only.

## Machine Fields

- `status`: `FOUND`, `MISSING`, `INVALID` のいずれか。
- `feature`: 正規化済み feature 名。
- `phase`: 現在の `spec.json.phase`。`status` が `MISSING` の場合は `null`。
- `approvals`: `requirements`、`design`、`tasks` の generated/approved boolean を持つ object。
- `readiness`: `READY`, `NOT_READY`, `INCONSISTENT` のいずれか。
- `ready_for_implementation`: `spec.json` に存在する場合の boolean。
- `error_category`: 必要に応じて `FEATURE_NOT_FOUND`, `ARTIFACT_MISSING`, `SPEC_JSON_INVALID`, `LIFECYCLE_INCONSISTENT` などの共通カテゴリを入れる。
- `evidence`: 確認した artifact path と state fact の配列。
- `summary`: 人間向け説明。workflow branching に使ってはならない。

## Branching Rule

workflow rule は `summary` ではなく、`status`、`readiness`、`error_category` を参照して分岐する。
