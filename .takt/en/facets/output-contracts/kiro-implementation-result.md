{extends: validation}

# Kiro Implementation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines selected task implementation fields.

## Machine Fields

- `STATUS`: primary implementation field; one of `READY_FOR_REVIEW`, `BLOCKED`, `NEEDS_CONTEXT`.
- `ready_for_implementation`: boolean readiness gate result for planning output.
- `selected_task`: the single task selected for this iteration, or `N/A` when no task can be selected.
- `blocker_note_required`: boolean indicating whether `update-progress` must write a selected-task blocker note.
- `implementation_plan`: selected task boundary, dependencies, requirement coverage, file scope, and validation commands.
- `baseline_dirty_files`: pre-existing dirty files captured during planning; these are not part of the selected task diff.
- `task_set_status`: one of `ALL_TASKS_COMPLETE`, `REMAINING_TASKS_EXIST`, or `N/A`; derived from executable leaf task checkboxes only, not group header checkboxes.
- `dispatch_mode`: one of `single`, `wave`, `wave_apply`, or `N/A`; selects the normal one-task path, TeamLeader wave path, or wave-result apply path.
- `wave_id`: stable identifier for a `(P)` task wave, or `N/A`.
- `wave_tasks`: selected `(P)` executable leaf tasks for a TeamLeader wave, including `_Boundary:_`, `_Depends:_`, `task_worktree`, and `task_branch` when prepared.
- `wave_worktrees`: preparation status for isolated worktrees, or `N/A`.
- `wave_result_refs`: references to TeamLeader part results that are ready, blocked, or still pending application.
- `wave_part_status`: per-part result status for a TeamLeader wave task, such as `READY_FOR_REVIEW`, `COMPLETE`, `BLOCKED`, or `NEEDS_CONTEXT`.
- `task_worktree`: isolated worktree path for a wave task, or `N/A` on the normal one-task path.
- `task_branch`: isolated branch for a wave task, or `N/A` on the normal one-task path.
- `changed_files`: files edited for the selected task.
- `validation_evidence`: commands, exit codes, and fresh outputs.
- `RED_PHASE_OUTPUT`: failing test evidence for behavioral tasks, or `N/A`.
- `manual_verification_requirement`: manual checks that remain outside automatic validation.
- `missing_context`: required context when `STATUS` is `NEEDS_CONTEXT`.
- `debug_context`: failure evidence when `STATUS` is `BLOCKED`.
- `summary`: human-readable explanation only.

## Branching Rule

Workflow rules branch on `STATUS` plus the documented machine fields above; `summary` is never used for routing.

## Report Preservation

This contract describes an implementation result, not a validation review. Report generation must preserve the step's implementation machine fields and must not rewrite them as `APPROVE`, `REJECT`, `Final Validation Result`, or finding tables unless the step explicitly produced that shape. When the step response already contains `STATUS`, `dispatch_mode`, `wave_result_refs`, `changed_files`, or `validation_evidence`, carry those fields into the report instead of re-judging them.
