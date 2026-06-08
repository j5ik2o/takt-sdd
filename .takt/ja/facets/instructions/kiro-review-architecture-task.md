{extends: review-arch}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-review` または `/kiro-review` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-review` または `/kiro-review` の `## Outputs` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Architecture Review Adapter

## Kiro 固有差分

selected task implementationだけを、requirements、design boundary、task `_Boundary:_`、actual diff、fresh validation evidenceに照らしてarchitecture reviewする。

verdict を作る前に `kiro-ai-antipattern-review.md` を読む。`kiro-ai-antipattern-fix.md` は current AI quality gate subworkflow run に存在する場合だけ読む。この report は first-pass AI review approval では生成されないため optional とする。未解決の AI antipattern finding、stale または cross-run の fix evidence、fix report が存在する場合に finding 単位の根拠がない `NO_FIX_NEEDED`、または `NEED_REPLAN` / `BLOCKED` の fix result は、selected task に紐づく architecture finding として扱う。

## Output mapping

`architecture-review` 形式を返す。

- `VERDICT`: `APPROVED` または `REJECTED`。
- `APPROVED`: Kiro selected task boundary、design boundary、dependency direction、scope guard、AI gate evidence がすべて問題ない場合だけ使う。
- `REJECTED`: selected task implementationに修正可能なarchitecture findingがある場合だけ使う。
- `FINDINGS`: selected task、requirement refs、boundary evidenceに紐づくactionable findings。
- `MECHANICAL_RESULTS`: validation command results、static checks、boundary audit。
- `SUMMARY`: human-readable summaryのみ。

reviewer child step は `VERDICT APPROVED` を condition `approved`、`VERDICT REJECTED` を condition `needs_fix` として返す。親 `reviewers` group は child condition だけを集約する。
