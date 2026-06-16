{extends: fix}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `### Manual Mode (main context)` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Progress Update Adapter

## Kiro-specific delta

Update only the selected task progress after completion verification or blocker decision. The selected task section must be re-read immediately before writing.

## Update rules

1. When completion `STATUS` is `VERIFIED` and `safe_to_update_progress` is true, change only the selected task checkbox to `- [x]`.
2. Append or update implementation evidence and `Implementation Notes` only inside the selected task or the shared notes section.
3. When `BLOCK_TASK`, `STOP_FOR_HUMAN`, or nonproductive monitor handling reaches this step, do not check the checkbox; write a blocker note for the selected task.
4. If the selected task state changed after planning, stop instead of overwriting another worker.
5. Never update unrelated task checkboxes, blocker notes, or completion evidence.

## Output mapping

After writing `tasks.md`, emit one of these machine statuses for workflow routing:

- `STATUS: READY_FOR_REVIEW` when the selected task checkbox or blocker note was updated successfully and the workflow may move to the next gate.
- `task_set_status: ALL_TASKS_COMPLETE | REMAINING_TASKS_EXIST | N/A` after re-reading `tasks.md`; compute this from executable leaf task checkboxes only (task ids like `1.1`, `2.3`), ignoring group header checkboxes like `1.`. Use `N/A` when no checkbox was completed.
- `STATUS: BLOCKED` when the selected task cannot be updated safely, including stale task state or missing write evidence.
- `STATUS: NEEDS_CONTEXT` when human input is required before any progress or blocker note can be written.

Progress update is allowed only after planning, debug, or completion adapter steps have resolved the selected task and write intent.

## Per-task commit (VERIFIED path only)

When completion `STATUS` is `VERIFIED` and the selected task checkbox is updated to `- [x]`, perform a selective per-task commit as follows:

1. `git add <changed_files> tasks.md` — stage only the selected task's changed files and `tasks.md`. NEVER use `git add -A`.
2. `git commit -m "feat(<feature>): <task>"` — create the commit.

When `BLOCK_TASK`, `STOP_FOR_HUMAN`, or nonproductive loop handling (BLOCKED/NEEDS_CONTEXT paths) reaches this step, do not create a commit.

Reconciliation note: in pipeline/`--skip-git` mode takt's automatic commit is disabled, so this per-task commit is the only commit and preserves per-task granularity; in worktree mode the end-of-run `git add -A` auto-commit remains, but the per-task commit keeps the tree clean so only residue is captured. The `allow_git_commit: true` step attribute is what permits this commit.
