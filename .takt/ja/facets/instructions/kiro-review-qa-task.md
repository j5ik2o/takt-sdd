---
extends_skill: kiro-review
extends_skill_section: "## Outputs"
---

{extends: review-qa}

# Kiro QA Review Adapter

## Kiro 固有差分

selected task implementationだけを、requirements、acceptance criteria、task `_Requirements:_`、validation evidence、actual diffに照らしてQA reviewする。

verdict を作る前に `kiro-ai-antipattern-review.md` を読む。`kiro-ai-antipattern-fix.md` は current AI quality gate subworkflow run に存在する場合だけ読む。この report は first-pass AI review approval では生成されないため optional とする。未解決の AI antipattern finding、stale または cross-run の fix evidence、fix report が存在する場合に finding 単位の根拠がない `NO_FIX_NEEDED`、または `NEED_REPLAN` / `BLOCKED` の fix result は、selected task に紐づく QA finding として扱う。

## Output mapping

`qa-review` 形式を返す。

- `VERDICT`: `APPROVED` または `REJECTED`。
- `APPROVED`: selected task の acceptance coverage、edge cases、error handling、manual verification requirement、AI gate evidence がすべて問題ない場合だけ使う。
- `REJECTED`: selected task implementationに修正可能なQA findingがある場合だけ使う。
- `FINDINGS`: selected task、requirement refs、validation evidenceに紐づくactionable findings。
- `MECHANICAL_RESULTS`: validation command results、static checks、manual verification notes。
- `SUMMARY`: human-readable summaryのみ。

reviewer child step は `VERDICT APPROVED` を condition `approved`、`VERDICT REJECTED` を condition `needs_fix` として返す。親 `reviewers` group は child condition だけを集約する。
