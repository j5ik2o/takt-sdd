{extends: implement-after-tests}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `## Step 3: Execute Implementation` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
Also read the `## Feature Flag Protocol` section.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Wave Result Apply Adapter

## Kiro-specific delta

Apply exactly one ready wave result into the main worktree so the existing selected-task quality gates can review it. This step converts a TeamLeader part result back into the normal `kiro-task-implementation-result.md` contract.

## Apply rules

1. Require `dispatch_mode: wave_apply` or a fresh `dispatch_mode: wave` aggregate with `wave_result_refs`.
2. Select the first successful `wave_part_status` (`READY_FOR_REVIEW` or `COMPLETE`) whose `selected_task` is still unchecked in `tasks.md`.
3. Re-read `tasks.md`, `task_worktree`, `task_branch`, and `baseline_dirty_files` immediately before applying.
4. Apply or merge only that selected task's diff from `task_branch` into the main worktree.
5. Stop with `STATUS: BLOCKED` if the main worktree changed outside `baseline_dirty_files`, if the task checkbox is no longer unchecked, if the branch conflicts, or if `changed_files` exceeds `_Boundary:_`.
6. Preserve `RED_PHASE_OUTPUT`, `validation_evidence`, `changed_files`, `task_worktree`, `task_branch`, `wave_id`, and `wave_result_refs` in the parent result.
7. Do not update task checkboxes, blocker notes, or `Implementation Notes`; existing review, verify, and progress steps own those gates.

## Status Report

- `STATUS`: `READY_FOR_REVIEW`, `BLOCKED`, or `NEEDS_CONTEXT`.
- `dispatch_mode`: `wave_apply`.
- `selected_task`: the single task applied to the main worktree.
- `baseline_dirty_files`: pre-existing dirty files captured during dispatch.
- `changed_files`: files changed inside the selected task boundary.
- `validation_evidence`: commands, exit codes, and fresh results from the wave part plus any apply-time checks.
- `RED_PHASE_OUTPUT`: required for behavioral tasks, otherwise `N/A`.
- `task_worktree` and `task_branch`: source isolation state for the applied part.
- `wave_result_refs`: remaining ready or blocked wave results.

## Output mapping

Emit `kiro-task-implementation-result.md` in `kiro-implementation-result` format. `STATUS: READY_FOR_REVIEW` routes to `ai-quality-gate`; failures route to `debug-task` so the selected task can fall back to normal single-task repair.
