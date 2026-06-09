{extends: plan}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 2: Select Tasks & Determine Mode` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro One Task Planning Adapter

## Kiro 固有差分

このTAKT iterationで実行する one task だけを計画する。このfacetは `$kiro-impl` または `/kiro-impl` のtask selectionをworkflow stateへ写像するだけで、code editも `tasks.md` 更新も行わない。

## Input artifacts

- `ready_for_implementation` を持つ `.kiro/specs/<feature>/spec.json`。
- `.kiro/specs/<feature>/requirements.md`、`design.md`、`tasks.md`。
- task annotation の `_Boundary:_`、`_Depends:_`、numeric requirement coverage、blocker notes、checkbox state。
- 利用可能な場合はstatus validationのread-only readiness signal。
- `git status --porcelain` による planning 時点の既存未コミット files。

## Planning rules

1. `ready_for_implementation` がtrueでない、approvalが不足する、required artifactsが欠ける場合はedit前に停止する。
2. `_Depends:_` が完了済みで、blocker notesが実行を止めていないunchecked taskの先頭 one task を選ぶ。
3. `_Depends:_ none` はempty dependency setとして扱う。
4. implementation planには `_Boundary:_`、`_Depends:_`、requirement numbers、selected task text、禁止する隣接scope、validation command hintsを含める。
5. planning 時点の既存未コミット files を `baseline_dirty_files` として記録する。これは selected task diff ではなく、後続 gate が scope mismatch を判断するための baseline として扱う。
6. exactly one selected task と有効なimplementation planがある場合は `STATUS: READY_FOR_REVIEW` を返す。
7. unchecked task が task annotation不足またはboundary conflictで止まる場合は、`selected_task` と `blocker_note_required: true` を含めて `STATUS: BLOCKED` を返す。
8. eligibleなunchecked taskがない、またはfeature readinessが失敗した場合は、`selected_task` なしで `STATUS: BLOCKED` を返す。

## Output mapping

workflowは `STATUS: READY_FOR_REVIEW` かつ one task が選択された場合だけ `execute-task` へ進む。selected task付きの `STATUS: BLOCKED` はprogress/blocker handlingへ進み、readiness-levelの `STATUS: BLOCKED` は `tasks.md` を書かずに停止する。このadapterはstandalone review/debug workflowを作らない。
