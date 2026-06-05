{extends: validation}

# Kiro Debug Decision Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines debug decision fields.

## Machine Fields

- `decision`: `RETRY_TASK`, `BLOCK_TASK`, `STOP_FOR_HUMAN` のいずれか。
- `root_cause`: machine-readable な根本原因。
- `failure_category`: validation、review、dependency、environment、artifact、unknown のいずれか。
- `retry_eligible`: boolean。
- `abort_reason`: `decision` が `STOP_FOR_HUMAN` の場合は必須。
- `affected_task_refs`: 影響を受ける task reference。
- `evidence`: failure output、file path、確認済み state。
- `summary`: 人間向け debug explanation のみ。

## Branching Rule

workflow rule は `decision` と `retry_eligible` を参照して分岐する。
