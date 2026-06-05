{extends: validation}

# Kiro Completion Verification Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines completion verification fields.

## Machine Fields

- `verdict`: `COMPLETE`, `INCOMPLETE`, `BLOCKED` のいずれか。
- `completed_task_refs`: complete として扱える task reference。
- `remaining_work`: 不足 evidence、未解決 finding、未完了作業の配列。
- `verification_evidence`: test、build、review、manual verification の fact。
- `blocked_reason`: `verdict` が `BLOCKED` の場合は必須。
- `safe_to_update_progress`: boolean。`verdict` が `COMPLETE` の場合だけ true。
- `summary`: 人間向け completion explanation のみ。

## Branching Rule

workflow rule は `verdict` と `safe_to_update_progress` を参照して分岐する。
