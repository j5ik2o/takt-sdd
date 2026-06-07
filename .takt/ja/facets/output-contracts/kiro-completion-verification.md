{extends: validation}

# Kiro Completion Verification Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines completion verification fields.

## Machine Fields

- `STATUS`: `kiro-verify-completion` の primary field。`VERIFIED`, `NOT_VERIFIED`, `MANUAL_VERIFY_REQUIRED` のいずれか。
- `verdict`: 互換用の completion classification。`COMPLETE`, `INCOMPLETE`, `BLOCKED` のいずれか。
- `completed_task_refs`: complete として扱える task reference。
- `remaining_work`: 不足 evidence、未解決 finding、未完了作業の配列。
- `verification_evidence`: test、build、review、manual verification の fact。
- `blocked_reason`: `STATUS` が `MANUAL_VERIFY_REQUIRED` または `verdict` が `BLOCKED` の場合は必須。
- `safe_to_update_progress`: boolean。`STATUS` が `VERIFIED` で、remaining work がない場合だけ true。
- `summary`: 人間向け completion explanation のみ。

## Branching Rule

workflow rule は `STATUS` と `safe_to_update_progress` を参照して分岐する。
