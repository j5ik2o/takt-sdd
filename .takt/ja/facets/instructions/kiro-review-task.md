---
extends_skill: kiro-review
extends_skill_section: "## Outputs"
---

{extends: review-coding}

# Kiro Task Review Adapter

## Kiro 固有差分

selected task implementationだけを、requirements、design boundary、task `_Boundary:_`、validation evidence、actual diffに照らしてreviewする。

## Output mapping

`kiro-review` の `## Review Verdict` 形式を返す。

- `VERDICT`: `APPROVED` または `REJECTED`。
- `FINDINGS`: selected task、requirement refs、boundary evidenceに紐づくactionable findings。
- `MECHANICAL_RESULTS`: validation command results、static checks、boundary audit、RED phase status。
- `SUMMARY`: human-readable summaryのみ。

workflow rulesは `VERDICT` で分岐し、別fieldへ翻訳しない。
