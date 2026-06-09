{extends: implement-after-tests}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 3: Execute Implementation` section をこの step の source of truth として適用する。
追加で `## Feature Flag Protocol` section も読む。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Task Execution Adapter

## Kiro 固有差分

selected task boundaryの内側だけを実装し、`kiro-impl.yaml` が読む正確な `## Status Report` machine fieldを返す。

## Execution rules

1. selected task の `_Boundary:_` とimplementation planで正当化されるfileだけを編集する。
2. behavioral workではimplementation evidenceの前に `RED_PHASE_OUTPUT` evidenceを含める。
3. task-relevant validation commandsを実行し、command result、manual verification requirement、missing evidenceを分離する。
4. selected task checkboxや `Implementation Notes` は更新しない。
5. planning report の `baseline_dirty_files` を保持し、selected taskで編集したfileだけを `changed_files` に列挙する。
6. code editとtask-local validation evidenceがreview可能な場合だけ `STATUS: READY_FOR_REVIEW` を返す。
7. `$kiro-debug` または `/kiro-debug` に渡せるfailure evidenceがある場合は `STATUS: BLOCKED` を返す。
8. task、runtime、validation contextが不足する場合は `STATUS: NEEDS_CONTEXT` を返す。

## Status Report

- `STATUS`: `READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `baseline_dirty_files`: planning時点の既存未コミットfiles。
- `changed_files`: selected task boundary内で変更したfile。
- `validation_evidence`: commands、exit codes、fresh results。
- `RED_PHASE_OUTPUT`: behavioral tasksでは必須、それ以外は `N/A`。
- `missing_context`: `STATUS` が `NEEDS_CONTEXT` の場合に必要な情報。
- `debug_context`: `STATUS` が `BLOCKED` の場合のfailure symptom、command output、current state。
- `summary`: human-readable summaryのみ。

## Output mapping

`kiro-implementation-result` report formatを使う。workflow rulesは `STATUS` で分岐し、proseや翻訳されたvalidation fieldでは分岐しない。
