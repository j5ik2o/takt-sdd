{extends: fix}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-debug` または `/kiro-debug` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-debug` または `/kiro-debug` の `## Outputs` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Debug Adapter

## Kiro 固有差分

selected taskのimplementation、validation、review failureを調査し、root-cause-first actionを返す。このadapterはtaskが修復可能か、blockedか、人間入力が必要かだけを判断する。

## Debug inputs

- `kiro-task-implementation-result.md`
- `kiro-ai-antipattern-review.md`
- current AI quality gate subworkflow run に存在する場合だけ optional な `kiro-ai-antipattern-fix.md`
- `kiro-task-coding-review.md`
- `kiro-task-architecture-review.md`
- `kiro-task-qa-review.md`
- `kiro-task-testing-review.md`

`reviewers` group が `any("needs_fix")` でここへ来た場合は、rejected child report の観点、report file、finding refs、selected task refs、requirement/design refsを root cause 判定に使う。AI gate の `need_replan` でここへ来た場合は、`NEED_REPLAN` / `BLOCKED` / ambiguous AI review evidence を人間確認または blocker candidate として扱う。

## Output mapping

`$kiro-debug` または `/kiro-debug` の `## Debug Report` 形式を返す。

- `ROOT_CAUSE`: evidence-backedな簡潔な原因。
- `CATEGORY`: Kiro debug category。
- `FIX_PLAN`: 該当する場合の最小selected-task repair plan。
- `VERIFICATION`: 次のimplementer向けcommandまたはchecklist。
- `NEXT_ACTION`: `RETRY_TASK`、`BLOCK_TASK`、`STOP_FOR_HUMAN` のいずれか。
- `retry_eligible`: boolean。workflow rule がretry可能/不可を区別できるよう、`NEXT_ACTION` と一緒に必ず返す。
- `CONFIDENCE`: `HIGH`、`MEDIUM`、`LOW` のいずれか。
- `NOTES`: 次のadapter step向けcontext。

workflow rulesは `NEXT_ACTION` と `retry_eligible` で分岐する。反復制御は `kiro-impl.yaml` の `loop_monitors.threshold` に置く。
