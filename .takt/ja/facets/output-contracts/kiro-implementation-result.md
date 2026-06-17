{extends: validation}

# Kiro Implementation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines selected task implementation fields.

## Machine Fields

- `STATUS`: primary implementation field。`READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `ready_for_implementation`: planning outputで使うboolean readiness gate result。
- `selected_task`: このiterationで選択したsingle task。選択できない場合は `N/A`。
- `blocker_note_required`: `update-progress` がselected-task blocker noteを書く必要があるかを示すboolean。
- `implementation_plan`: selected taskのboundary、dependencies、requirement coverage、file scope、validation commands。
- `baseline_dirty_files`: planning時点の既存未コミットfiles。selected task diffの一部ではない。
- `task_set_status`: `ALL_TASKS_COMPLETE`、`REMAINING_TASKS_EXIST`、`N/A` のいずれか。executable leaf task checkboxだけから導出し、group header checkboxは含めない。
- `dispatch_mode`: `single`、`wave`、`wave_apply`、`N/A` のいずれか。normal one-task path、TeamLeader wave path、wave-result apply pathを選ぶ。
- `wave_id`: `(P)` task waveのstable identifier。該当しない場合は `N/A`。
- `wave_tasks`: TeamLeader waveで選択した `(P)` executable leaf tasks。準備後は `_Boundary:_`、`_Depends:_`、`task_worktree`、`task_branch` を含める。
- `wave_worktrees`: isolated worktrees のpreparation status。該当しない場合は `N/A`。
- `wave_result_refs`: ready、blocked、または未適用のTeamLeader part resultsへのreferences。
- `wave_part_status`: TeamLeader wave taskごとのpart result status。例: `READY_FOR_REVIEW`、`COMPLETE`、`BLOCKED`、`NEEDS_CONTEXT`。
- `task_worktree`: wave taskのisolated worktree path。normal one-task pathでは `N/A`。
- `task_branch`: wave taskのisolated branch。normal one-task pathでは `N/A`。
- `changed_files`: selected taskで編集したfiles。
- `validation_evidence`: commands、exit codes、fresh outputs。
- `RED_PHASE_OUTPUT`: behavioral tasksのfailing test evidence、または `N/A`。
- `manual_verification_requirement`: automatic validation外に残るmanual checks。
- `missing_context`: `STATUS` が `NEEDS_CONTEXT` の場合のrequired context。
- `debug_context`: `STATUS` が `BLOCKED` の場合のfailure evidence。
- `summary`: human-readable explanationのみ。

## Branching Rule

workflow rulesは `STATUS` と上記machine fieldsで分岐する。`summary` はroutingに使わない。

## Report Preservation

この contract はimplementation resultを表すものであり、validation reviewではない。Report generation はstepのimplementation machine fieldsを保持し、stepが明示的にその形を出していない限り、`APPROVE`、`REJECT`、`Final Validation Result`、finding tablesへ書き換えない。step responseに `STATUS`、`dispatch_mode`、`wave_result_refs`、`changed_files`、`validation_evidence` が含まれる場合は、再判定せずreportへ引き継ぐ。
