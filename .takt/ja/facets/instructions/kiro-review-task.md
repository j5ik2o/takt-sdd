---
extends_skill: kiro-review
extends_skill_section: "## Outputs"
---

{extends: review-coding}

# Kiro Task Review Adapter

## Kiro 固有差分

selected task implementationだけを、requirements、design boundary、task `_Boundary:_`、validation evidence、actual diffに照らしてreviewする。

verdict を作る前に `kiro-ai-antipattern-review.md` を読む。`kiro-ai-antipattern-fix.md` は current AI quality gate subworkflow run に存在する場合だけ読む。この report は first-pass AI review approval では生成されないため optional とする。未解決の AI antipattern finding、stale または cross-run の fix evidence、fix report が存在する場合に finding 単位の根拠がない `NO_FIX_NEEDED`、または `NEED_REPLAN` / `BLOCKED` の fix result は、selected task に紐づく review finding として扱う。

## Output mapping

`kiro-review` の `## Review Verdict` 形式を返す。

- `VERDICT`: `APPROVED` または `REJECTED`。
- `FINDINGS`: selected task、requirement refs、boundary evidenceに紐づくactionable findings。
- `MECHANICAL_RESULTS`: validation command results、static checks、boundary audit、RED phase status。
- `SUMMARY`: human-readable summaryのみ。

workflow rulesは `VERDICT` で分岐し、別fieldへ翻訳しない。
