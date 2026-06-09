# AI Review Instructions

## Do Not
- Do not run build or test commands. This step is review-only; execution-based verification belongs to `implement` and `fix`.

## Do
1. Inspect the target files for AI-generated-code issues:
   - hallucinated APIs
   - nonexistent imports or paths
   - over-abstraction
   - unused code
   - backward-compatibility additions that were not requested
2. Extract any previously open findings from Previous Response and assign each one a `finding_id`
3. Classify each finding as `new`, `persists`, or `resolved`
4. If at least one blocking issue exists, return `REJECT`; otherwise return `APPROVE`

## Kiro spec generation draft mode

When the current workflow is `kiro-spec-ai-quality-gate` and the caller step name contains a phase such as `requirements`, `design`, or `tasks`, choose the target by phase.

- Determine the review phase from the caller step name (for example, `ai-quality-gate-tasks` / `quick-ai-quality-gate-tasks`) and the caller phase result report. Do not infer the review phase from `spec.json.phase`.
- In tasks phase, it is normal that `spec.json.phase` is still `design-generated`. That is the lifecycle state before finalize-tasks, and it is not a reason to switch the review target back to a design draft.
- In design phase (`ai-quality-gate-design` or `quick-ai-quality-gate-design`), it is normal that `.kiro/specs/<feature>/design.md` does not exist yet. Review `draft_artifacts.design` or the `## design.md draft` section from Previous Response or the caller Report Directory's `kiro-spec-design-result.md` / `kiro-spec-design-repair-result.md` / `kiro-spec-quick-design-result.md` / `kiro-spec-quick-design-repair-result.md`.
- In tasks phase (`ai-quality-gate-tasks` or `quick-ai-quality-gate-tasks`), it is normal that `.kiro/specs/<feature>/tasks.md` does not exist yet. Review `draft_artifacts.tasks` or the `## draft_artifacts.tasks` / `## Draft tasks.md` section from Previous Response or the caller Report Directory's `kiro-spec-tasks-result.md` / `kiro-spec-tasks-repair-result.md` / `kiro-spec-quick-tasks-result.md` / `kiro-spec-quick-tasks-repair-result.md`.
- In tasks phase, using design.md, research.md, installer source, or untracked spec files as the primary review target is a scope mismatch. Return `REJECT` and report `ai_gate_scope_mismatch` as the finding_id.
- In draft mode, do not review the git diff, current dirty worktree, or uncommitted workflow/facet/script/test changes as the target. Use them only as supporting evidence for reading the draft; the review target is fixed to the phase draft artifact.
- If you run `git diff`, always limit it to `.kiro/specs/<feature>/` or the caller phase result report path. Unscoped git diff, meaning `git diff` without a path filter, is forbidden as a review target in draft mode.
- If the draft target is missing, do not fall back to git diff, `.kiro/specs/<feature>/design.md`, or another phase artifact.
- In requirements and tasks phases, when `draft_status: READY_FOR_REVIEW` is present, prefer the draft content from Previous Response or the phase result report.
- If the target draft is unavailable, do not substitute an existing artifact from another phase and return `APPROVE`. Return `REJECT` with `missing_draft_artifact` as the finding_id.
- If the report targeted the git diff, current dirty worktree, or unrelated workflow/facet changes, do not return `APPROVE`. Return `REJECT` and report `ai_gate_scope_mismatch` as the finding_id.
- In design phase AI gate reports, explicitly state that the reviewed target is the design draft. A report about a requirements draft is not valid evidence for downstream design review.
- In design phase AI gate reports, include `review_target: design_draft`. If unscoped git diff was read, set `review_target: git_diff` and return `REJECT` / `ai_gate_scope_mismatch`.
- In tasks phase AI gate reports, explicitly state that the reviewed target is the tasks draft. Reports about uncommitted workflow/facet/script/test diffs are not valid evidence for downstream task review.
- In tasks phase AI gate reports, include `review_target: tasks_draft`. If unscoped git diff was read, set `review_target: git_diff` and return `REJECT` / `ai_gate_scope_mismatch`.

## Kiro implementation selected-task mode

When the current workflow is `kiro-ai-quality-gate`, fix the target to the selected task implementation.

- Read the caller's `kiro-task-implementation-result.md` and `kiro-implementation-plan.md`; confirm `selected_task`, `baseline_dirty_files`, `changed_files`, and validation evidence.
- The review target is only the path-filtered diff for `changed_files`. When reading the code diff, use `git diff -- <changed_files>`.
- Do not use unscoped `git diff`, the whole current dirty worktree, or pre-existing dirty files listed in `baseline_dirty_files` as the primary review target.
- If `changed_files` is empty, the implementation report is missing, or the selected task / boundary cannot be identified, return `REJECT` and report `implementation_scope_mismatch` as the finding_id.
- If `git status --porcelain` contains a dirty file that is in neither `baseline_dirty_files` nor `changed_files`, treat it as a fatal selected task scope condition. Return `REJECT` with `implementation_scope_mismatch`; do not downgrade it to non-blocking evidence before reviewers.
- Implementation AI gate reports must include `review_target: selected_task_diff` and `changed_files`. If unscoped git diff was used as the primary target, set `review_target: git_diff` and return `REJECT` / `implementation_scope_mismatch`.

## Required Output
0. In Kiro spec generation draft mode or implementation selected-task mode, state `review_target`
1. State the evidence for each finding
2. End with `APPROVE` or `REJECT`
3. If `REJECT`, include a suggested fix with file/line references
