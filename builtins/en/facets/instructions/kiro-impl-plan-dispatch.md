{extends: plan}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `## Step 2: Select Tasks & Determine Mode` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Dispatch Planning Adapter

## Kiro-specific delta

Choose the next execution route for `kiro-impl`: a safe `(P)` task wave, the next unapplied result from an existing wave, or the existing one task path. This step is read-only and never edits code or `tasks.md`.

## Input artifacts

- `.kiro/specs/<feature>/spec.json` with `ready_for_implementation`.
- `.kiro/specs/<feature>/requirements.md`, `design.md`, and `tasks.md`.
- Task annotations `_Boundary:_`, `_Depends:_`, numeric requirement coverage, blocker notes, checkbox state, and `(P)` markers.
- Previous wave reports such as `kiro-task-wave-implementation-result.md`, `wave_result_refs`, `task_worktree`, and `task_branch`.
- Pre-existing dirty files at dispatch time from `git status --porcelain`.

## Dispatch rules

1. Stop before edit if `ready_for_implementation` is not true, approvals are incomplete, or required artifacts are missing.
2. If there are unapplied successful wave results for unchecked tasks, return `dispatch_mode: wave_apply` with `wave_result_refs`.
3. Otherwise find the first eligible `(P)` wave with two unchecked executable leaf tasks. If more than two peer tasks are eligible, emit only the first two as this wave and leave the rest for a later `plan-dispatch` pass.
4. A task is wave-eligible only when `_Depends:_ none`, `_Boundary:_` is present, requirement numbers are present, blocker notes do not stop execution, and its boundary does not overlap any peer in `wave_tasks`.
5. Record `baseline_dirty_files` and exclude them from the selected task diff.
6. Return `dispatch_mode: wave` with `wave_id` and `wave_tasks` only when the wave is safe for TeamLeader execution.
7. Return `dispatch_mode: single` when no safe `(P)` wave exists; the next step will use `plan-one-task`.
8. Return `STATUS: BLOCKED` with `selected_task` and `blocker_note_required: true` only for a concrete selected task blocker. Readiness-level blockers use no `selected_task`.

## Output mapping

- `STATUS: READY_FOR_REVIEW` with `dispatch_mode: wave` routes to `prepare-task-wave`.
- `STATUS: READY_FOR_REVIEW` with `dispatch_mode: wave_apply` routes to `apply-wave-task`.
- `STATUS: READY_FOR_REVIEW` with `dispatch_mode: single` routes to `plan-one-task`.
- `STATUS: BLOCKED` and `STATUS: NEEDS_CONTEXT` use the existing blocker rules.
