---
extends_skill: kiro-impl
extends_skill_section: "## Step 3: Execute Implementation"
extends_skill_additional_section: "## Feature Flag Protocol"
---

{extends: implement-after-tests}

# Kiro Task Execution Adapter

## Kiro 固有差分

selected task boundaryの内側だけを実装し、`kiro-impl.yaml` が読む正確な `## Status Report` machine fieldを返す。

## Execution rules

1. selected task の `_Boundary:_` とimplementation planで正当化されるfileだけを編集する。
2. behavioral workではimplementation evidenceの前に `RED_PHASE_OUTPUT` evidenceを含める。
3. task-relevant validation commandsを実行し、command result、manual verification requirement、missing evidenceを分離する。
4. selected task checkboxや `Implementation Notes` は更新しない。
5. code editとtask-local validation evidenceがreview可能な場合だけ `STATUS: READY_FOR_REVIEW` を返す。
6. `kiro-debug` に渡せるfailure evidenceがある場合は `STATUS: BLOCKED` を返す。
7. task、runtime、validation contextが不足する場合は `STATUS: NEEDS_CONTEXT` を返す。

## Status Report

- `STATUS`: `READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `changed_files`: selected task boundary内で変更したfile。
- `validation_evidence`: commands、exit codes、fresh results。
- `RED_PHASE_OUTPUT`: behavioral tasksでは必須、それ以外は `N/A`。
- `missing_context`: `STATUS` が `NEEDS_CONTEXT` の場合に必要な情報。
- `debug_context`: `STATUS` が `BLOCKED` の場合のfailure symptom、command output、current state。
- `summary`: human-readable summaryのみ。

## Output mapping

`kiro-implementation-result` report formatを使う。workflow rulesは `STATUS` で分岐し、proseや翻訳されたvalidation fieldでは分岐しない。
