{extends: implement-after-tests}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `## Step 3: Execute Implementation` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
Also read the `## Feature Flag Protocol` section.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro TeamLeader Task Wave Execution Adapter

## Kiro-specific delta

Use TeamLeader only to implement prepared `(P)` tasks in isolated worktrees. Review, verify, and `tasks.md` progress updates remain in the parent one-task loop.

## TeamLeader execution rules

1. Require `dispatch_mode: wave`, `wave_id`, `wave_tasks`, `task_worktree`, and `task_branch` from `kiro-task-wave-prepare.md`.
2. Decompose into exactly one TeamLeader part per wave task. Do not create extra discovery, verification, review, or progress-update parts.
3. Each part instruction must embed the concrete `selected_task`, `task_worktree`, `task_branch`, `_Boundary:_`, and validation command hint values copied verbatim from `kiro-task-wave-prepare.md`.
4. Do not invent wave-id-derived branch names. If the prepared manifest says `task_branch: kiro-impl/<feature>/<task-id>`, the part instruction must use that exact branch string.
5. Each part must work only inside its assigned `task_worktree` and `task_branch`. The part must run commands with `git -C <task_worktree> ...` or absolute paths under `<task_worktree>`; it must not write the main worktree.
6. Each part edits only files justified by its selected task `_Boundary:_` and implementation plan, resolved under the assigned `task_worktree`.
7. For literal boundary-file tasks, create or update only the boundary file, preserve the literal required content from the task text, and validate with the manifest validation command hint. Do not run broad review or progress-update work inside the part.
8. Each part must not update task checkboxes, blocker notes, or `Implementation Notes`.
9. For behavioral work, each part includes `RED_PHASE_OUTPUT` before implementation evidence.
10. Each part emits `wave_part_status`, `selected_task`, `task_worktree`, `task_branch`, `changed_files`, `validation_evidence`, `RED_PHASE_OUTPUT`, `missing_context`, and `debug_context`. Treat `READY_FOR_REVIEW` and `COMPLETE` as successful part statuses.
11. The aggregate treats `kiro-task-wave-prepare.md` as the authoritative manifest. If that report was summarized, recover the latest manifest entry list from a timestamped `kiro-task-wave-prepare.md.*` backup before using part output.
12. The aggregate must verify filesystem evidence for each prepared worktree with `git -C <task_worktree> status --porcelain`, `git -C <task_worktree> diff --name-only --`, and boundary file content checks. Part output is secondary evidence and must not be the only source of `changed_files` or `validation_evidence`.
13. When part output omits a result or reports a mismatched `task_branch`, use the `task_branch` and `_Boundary:_` from the prepared manifest entry, not the part-provided value.
14. When TeamLeader feedback asks whether more parts are needed, answer `done=true` with `parts: []` once the scheduled part ids already cover the prepared `wave_tasks`. Do not create refill, continuation, verification, or duplicate task part.
15. The aggregate emits `wave_result_refs` for successful or blocked parts. Return `STATUS: READY_FOR_REVIEW` when at least one prepared worktree has filesystem evidence ready to apply, `STATUS: NEEDS_CONTEXT` when required task context cannot be recovered from the manifest or filesystem, and `STATUS: BLOCKED` only when no part can proceed.

## Output mapping

This step routes to `collect-wave-results` after TeamLeader parts complete. `collect-wave-results` writes the `kiro-implementation-result` report from worktree filesystem evidence; parent review gates run only after one wave result is applied to the main worktree.
