---
extends_skill: kiro-verify-completion
extends_skill_section: "## Outputs"
---

{extends: supervise}

# Kiro Task Completion Verification Adapter

## Kiro 固有差分

checkbox updateの前に、fresh evidenceでselected task completion claimを検証する。

## Verification inputs

- implementation resultと `STATUS`。
- AI antipattern gate reports: `kiro-ai-antipattern-review.md`、および current AI quality gate subworkflow run に存在する場合だけ optional な `kiro-ai-antipattern-fix.md`。
- review `VERDICT`。
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
