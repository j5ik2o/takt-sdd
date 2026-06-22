{extends: fix}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `## Step 3: Execute Implementation` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Task Wave Preparation Adapter

## Kiro-specific delta

Prepare isolated git worktrees for a planned `(P)` task wave. This step creates only wave isolation state; it does not implement code and does not update `tasks.md`.

This step needs host-level git metadata writes because `git branch` and `git worktree add` create refs under `.git`. The workflow step must run with `required_permission_mode: full`; implementation parts remain `edit`.

## Preparation rules

1. Require `dispatch_mode: wave`, `wave_id`, and `wave_tasks` from `kiro-implementation-dispatch.md`.
2. For each wave task, create an isolated worktree under `.takt/worktrees/kiro-impl/<feature>/<task-id>/`.
3. Create or use the matching branch name `kiro-impl/<feature>/<task-id>` only for that `task_worktree`.
4. Stop with `STATUS: BLOCKED` if the branch or worktree already exists with unknown contents, if the base revision is ambiguous, or if a task lacks `_Boundary:_` or `_Depends:_ none`.
5. Preserve `baseline_dirty_files`; do not include them in any selected task diff.
6. Emit one manifest entry per task containing `selected_task`, `task_worktree`, `task_branch`, `_Boundary:_`, and validation command hints.
7. Preserve the manifest entry list in the final report `wave_tasks`; do not replace it with a validation summary or a worktree-only list.
8. Do not edit source files, task checkboxes, blocker notes, or `Implementation Notes`.

## Output mapping

- `STATUS: READY_FOR_REVIEW` with `dispatch_mode: wave`, `wave_tasks`, and `wave_worktrees prepared` routes to `execute-task-wave`.
- `STATUS: BLOCKED` with `selected_task` and `blocker_note_required: true` routes to progress/blocker handling.
- Other `STATUS: BLOCKED` or `STATUS: NEEDS_CONTEXT` stops the wave before TeamLeader execution.
