{extends: supervise}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-verify-completion` または `/kiro-verify-completion` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-verify-completion` または `/kiro-verify-completion` の `## Outputs` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Task Completion Verification Adapter

## Kiro 固有差分

checkbox updateの前に、fresh evidenceでselected task completion claimを検証する。

## Verification inputs

- implementation resultと `STATUS`。
- AI antipattern gate reports: `kiro-ai-antipattern-review.md`、および current AI quality gate subworkflow run に存在する場合だけ optional な `kiro-ai-antipattern-fix.md`。
- `kiro-ai-antipattern-fix.md` が存在する場合、`safe_to_update_progress` を true にする前に、`STATUS NEED_REPLAN`、`STATUS BLOCKED`、stale または cross-run の fix evidence、finding-level evidence がない `STATUS NO_FIX_NEEDED` を拒否する。
- reviewer reports: `kiro-task-coding-review.md`、`kiro-task-architecture-review.md`、`kiro-task-qa-review.md`、`kiro-task-testing-review.md`。
- 4 reviewer reports がすべて `approved` / `VERDICT APPROVED` の evidence を持つ場合だけ `VERIFIED` 候補にする。missing、stale、cross-run、または `needs_fix` / `VERDICT REJECTED` を含む report は `NOT_VERIFIED` または `MANUAL_VERIFY_REQUIRED` として扱う。
- validation evidenceとmanual verification requirement。
- selected task text、requirement refs、boundary scope。

## Output mapping

- `STATUS`: `VERIFIED`、`NOT_VERIFIED`、`MANUAL_VERIFY_REQUIRED` のいずれか。
- `CLAIM_TYPE`: `TASK`。
- `CLAIM`: selected task completion claim。
- `EVIDENCE`: fresh command outputとreview facts。
- `GAPS`: missing evidence、未解決の AI antipattern gate evidence、stale または cross-run の fix evidence、またはscope mismatch。
- `safe_to_update_progress`: `STATUS` が `VERIFIED` の場合だけtrue。

workflow rulesは `STATUS` と `safe_to_update_progress` で分岐する。
