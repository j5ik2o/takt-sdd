{extends: review-coding}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-review` or `/kiro-review` and read the resolved `SKILL.md`.
Apply the `## Outputs` section from `$kiro-review` or `/kiro-review` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Task Review Adapter

## Kiro-specific delta

Review only the selected task implementation against requirements, design boundary, task `_Boundary:_`, validation evidence, and the actual diff.

The actual diff is limited to `changed_files` from `kiro-task-implementation-result.md`. When reading the diff, use `git diff -- <changed_files>`; do not use unscoped `git diff` or the whole current dirty worktree as the primary target. `baseline_dirty_files` are pre-existing planning-time changes and are not selected task diff. If a dirty file is in neither `baseline_dirty_files` nor `changed_files`, or the AI gate report shows `implementation_scope_mismatch` / `review_target: git_diff`, return `VERDICT: REJECTED` so the workflow returns to debug-task early.

Read `kiro-ai-antipattern-review.md` before forming the verdict. Read `kiro-ai-antipattern-fix.md` only if that report exists in the current AI quality gate subworkflow run; it is optional because first-pass AI review approval does not produce a fix report. Treat unresolved AI antipattern findings, stale or cross-run fix evidence, missing finding-level `NO_FIX_NEEDED` evidence when a fix report exists, or a `NEED_REPLAN` / `BLOCKED` fix result as review findings tied to the selected task.

## Output mapping

Return the `## Review Verdict` shape from `$kiro-review` or `/kiro-review`.

- `VERDICT`: `APPROVED` or `REJECTED`.
- `FINDINGS`: actionable findings tied to the selected task, requirement refs, and boundary evidence.
- `MECHANICAL_RESULTS`: validation command results, static checks, boundary audit, and RED phase status.
- `SUMMARY`: human-readable summary only.

Do not add another output field for the verdict. `VERDICT` remains the output source of truth.

For TAKT routing only, map `VERDICT APPROVED` to child condition `approved` and `VERDICT REJECTED` to child condition `needs_fix`. The parent `reviewers` group aggregates only child conditions.
