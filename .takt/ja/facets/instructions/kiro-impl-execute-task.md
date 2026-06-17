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

## 検証証跡と debug 経路

この adapter は、後続の reviewer や completion verifier とは別の fresh TAKT agent step として実行される。同一 coder が自分の作業を自分で承認する、という意味の自己承認として説明してはならない。リスクは、後続 agent が `kiro-task-implementation-result.md` に記録された agent-reported validation evidence を読むことであり、単一 coder が自作業を承認することではない。

task-local validation commands を実際に実行し、その command、exit code、fresh output を `validation_evidence` に記録できた場合だけ `STATUS: READY_FOR_REVIEW` を返す。validation が失敗した、または実行できない場合は `STATUS: BLOCKED` または `STATUS: NEEDS_CONTEXT` を返し、workflow rules が `debug-task` へルーティングできるようにする。この step では無条件の TAKT command `quality_gates` block に依存しない。command gate は agent completion 後に常に実行されるため、ここに置くと rules 評価前に `BLOCKED` / `NEEDS_CONTEXT` 経路を先取りしてしまう。

## Implementation Notes の読込

選択タスクの実装を開始する前に、`tasks.md` の `## Implementation Notes` セクションのうち、選択タスクの境界・依存に関連する項目を読み込む。これらのノートには先行タスクで得た横断的な学びが記録されており、同じ失敗を繰り返さないための再発防止インプットとして活用する。参照・追記は選択タスクまたは共有 notes セクションの範囲に限定し、無関係な記述は変更しない。

## Output mapping

`kiro-implementation-result` report formatを使う。workflow rulesは `STATUS` で分岐し、proseや翻訳されたvalidation fieldでは分岐しない。
