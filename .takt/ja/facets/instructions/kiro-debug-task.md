---
extends_skill: kiro-debug
extends_skill_section: "## Outputs"
---

{extends: fix}

# Kiro Debug Adapter

## Kiro 固有差分

selected taskのimplementation、validation、review failureを調査し、root-cause-first actionを返す。このadapterはtaskが修復可能か、blockedか、人間入力が必要かだけを判断する。

## Output mapping

`kiro-debug` の `## Debug Report` 形式を返す。

- `ROOT_CAUSE`: evidence-backedな簡潔な原因。
- `CATEGORY`: Kiro debug category。
- `FIX_PLAN`: 該当する場合の最小selected-task repair plan。
- `VERIFICATION`: 次のimplementer向けcommandまたはchecklist。
- `NEXT_ACTION`: `RETRY_TASK`、`BLOCK_TASK`、`STOP_FOR_HUMAN` のいずれか。
- `CONFIDENCE`: `HIGH`、`MEDIUM`、`LOW` のいずれか。
- `NOTES`: 次のadapter step向けcontext。

workflow rulesは `NEXT_ACTION` で分岐する。反復制御は `kiro-impl.yaml` の `loop_monitors.threshold` に置く。
