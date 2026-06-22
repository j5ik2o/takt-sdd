{extends: review-coding}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-review` または `/kiro-review` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-review` または `/kiro-review` の `## Outputs` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Task Review Adapter

## Kiro 固有差分

selected task implementationだけを、requirements、design boundary、task `_Boundary:_`、validation evidence、actual diffに照らしてreviewする。

actual diff は `kiro-task-implementation-result.md` の `changed_files` に限定する。差分を読む場合は `git diff -- <changed_files>` を使い、path filter なしの `git diff` や current dirty worktree 全体を primary target にしてはならない。`baseline_dirty_files` は planning 時点の既存差分であり selected task diff ではない。`baseline_dirty_files` と `changed_files` のどちらにも含まれない dirty file がある、または AI gate report が `implementation_scope_mismatch` / `review_target: git_diff` を示す場合は `VERDICT: REJECTED` とし、早期に debug-task へ戻す。

verdict を作る前に `kiro-ai-antipattern-review.md` を読む。`kiro-ai-antipattern-fix.md` は current AI quality gate subworkflow run に存在する場合だけ読む。この report は first-pass AI review approval では生成されないため optional とする。未解決の AI antipattern finding、stale または cross-run の fix evidence、fix report が存在する場合に finding 単位の根拠がない `NO_FIX_NEEDED`、または `NEED_REPLAN` / `BLOCKED` の fix result は、selected task に紐づく review finding として扱う。

## Output mapping

`$kiro-review` または `/kiro-review` の `## Review Verdict` 形式を返す。

- `VERDICT`: `APPROVED` または `REJECTED`。
- `FINDINGS`: selected task、requirement refs、boundary evidenceに紐づくactionable findings。
- `MECHANICAL_RESULTS`: validation command results、static checks、boundary audit、RED phase status。
- `SUMMARY`: human-readable summaryのみ。

verdict 用の別 output field は追加しない。`VERDICT` を output source of truth として維持する。

TAKT routing に限り、`VERDICT APPROVED` を child condition `approved`、`VERDICT REJECTED` を child condition `needs_fix` に mapping する。親 `reviewers` group は child condition だけを集約する。
