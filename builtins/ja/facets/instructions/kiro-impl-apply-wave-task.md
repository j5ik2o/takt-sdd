{extends: implement-after-tests}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 3: Execute Implementation` section をこの step の source of truth として適用する。
追加で `## Feature Flag Protocol` section も読む。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Wave Result Apply Adapter

## Kiro 固有差分

readyなwave resultをexactly oneだけmain worktreeへ適用し、既存のselected-task quality gatesでreviewできる状態にする。このstepはTeamLeader part resultを通常の `kiro-task-implementation-result.md` contractへ戻す。

## Apply rules

1. `dispatch_mode: wave_apply`、または `wave_result_refs` を持つfreshな `dispatch_mode: wave` aggregateを必須にする。
2. `tasks.md` でまだuncheckedな `selected_task` を持つ最初のsuccessful `wave_part_status`（`READY_FOR_REVIEW` または `COMPLETE`）を選ぶ。
3. 適用直前に `tasks.md`、`task_worktree`、`task_branch`、`baseline_dirty_files` をre-readする。
4. そのselected taskのdiffだけを `task_branch` からmain worktreeへapplyまたはmergeする。
5. main worktreeが `baseline_dirty_files` 以外で変わっている、task checkboxがuncheckedでない、branch conflictがある、または `changed_files` が `_Boundary:_` を超える場合は `STATUS: BLOCKED` で止める。
6. `RED_PHASE_OUTPUT`、`validation_evidence`、`changed_files`、`task_worktree`、`task_branch`、`wave_id`、`wave_result_refs` をparent resultへ保持する。
7. task checkboxes、blocker notes、`Implementation Notes` は更新しない。既存のreview、verify、progress stepsがそれらのgateを担当する。

## Status Report

- `STATUS`: `READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `dispatch_mode`: `wave_apply`。
- `selected_task`: main worktreeへ適用したsingle task。
- `baseline_dirty_files`: dispatch時点の既存未コミットfiles。
- `changed_files`: selected task boundary内で変更したfiles。
- `validation_evidence`: wave partのcommands、exit codes、fresh results、およびapply-time checks。
- `RED_PHASE_OUTPUT`: behavioral tasksでは必須、それ以外は `N/A`。
- `task_worktree` と `task_branch`: applied partのsource isolation state。
- `wave_result_refs`: remaining readyまたはblocked wave results。

## Output mapping

`kiro-implementation-result` formatで `kiro-task-implementation-result.md` を出力する。`STATUS: READY_FOR_REVIEW` は `ai-quality-gate` へ進み、failureは `debug-task` へ進んでselected taskを通常のsingle-task repairへfallbackできるようにする。
