{extends: implement-after-tests}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `## Step 3: Execute Implementation` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Task Wave Result Collection Adapter

## Kiro-specific delta

Collect implementation results after TeamLeader parts finish. This is a normal parent step, not a TeamLeader part. It reads prepared worktrees and emits the wave implementation result report. It does not implement code, apply changes to the main worktree, or update `tasks.md`.

## Collection rules

1. Require `dispatch_mode: wave`, `wave_id`, `wave_tasks`, `task_worktree`, `task_branch`, and `_Boundary:_` from `kiro-task-wave-prepare.md`.
2. If `kiro-task-wave-prepare.md` was summarized, recover the latest manifest entry list from a timestamped `kiro-task-wave-prepare.md.*` backup in the same Report Directory.
3. Inspect filesystem evidence for each prepared worktree with `git -C <task_worktree> status --porcelain`, `git -C <task_worktree> diff --name-only --`, `git -C <task_worktree> ls-files --others --exclude-standard -- <boundary>`, and boundary file content checks.
4. Treat part output as secondary evidence only. Missing or truncated part output must not cause `NEEDS_CONTEXT` when filesystem evidence proves a boundary file is ready.
5. When available, read current run previous responses such as `context/previous_responses/execute-task-wave.*.md` and `context/previous_responses/latest.md` to recover part summaries, but do not require them when filesystem evidence is sufficient.
6. Treat `wave_part_status: READY_FOR_REVIEW` and `wave_part_status: COMPLETE` as successful part statuses when filesystem evidence and validation evidence pass.
7. Use the `task_branch` and `_Boundary:_` from the prepared manifest entry when part output is missing or contradictory.
8. Emit `wave_result_refs` entries containing `selected_task`, `task_worktree`, `task_branch`, `changed_files`, `validation_evidence`, `RED_PHASE_OUTPUT`, `wave_part_status`, and `missing_context`.
9. Return `STATUS: READY_FOR_REVIEW` when at least one prepared worktree has changed files inside its boundary and fresh validation evidence. Return `STATUS: NEEDS_CONTEXT` only when the manifest or filesystem evidence cannot be recovered. Return `STATUS: BLOCKED` only when filesystem evidence proves the task cannot proceed.
10. Do not edit source files, task checkboxes, blocker notes, or `Implementation Notes`.

## Status Report

- `STATUS`: `READY_FOR_REVIEW`, `BLOCKED`, or `NEEDS_CONTEXT`.
- `dispatch_mode`: `wave`.
- `wave_result_refs`: collected part results. Successful entries may have `wave_part_status: READY_FOR_REVIEW` or `wave_part_status: COMPLETE`.
- `changed_files`, `validation_evidence`, and `RED_PHASE_OUTPUT`: evidence recovered from filesystem checks and part summaries.

## Output mapping

Use the `kiro-implementation-result` report format. `STATUS: READY_FOR_REVIEW` with `dispatch_mode: wave` and `wave_result_refs` routes to `apply-wave-task`.
