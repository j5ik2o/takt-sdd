{extends: review-pure}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-spec-tasks` or `/kiro-spec-tasks` and read the resolved `SKILL.md`.
Apply the `### Step 3: Review Task Plan` section from `$kiro-spec-tasks` or `/kiro-spec-tasks` as this step's source of truth.
Also read the `### Step 3.5: Run Task-Graph Sanity Review` section.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Spec Tasks Review Instruction

## Kiro-specific delta

Review the draft task plan and task graph before `tasks.md` and lifecycle metadata are finalized. This adapter is read-only and must not write `tasks.md`, update `spec.json`, approve tasks, or set `ready_for_implementation`.

## Review procedure

1. Load `requirements.md`, `design.md`, `spec.json`, any existing `tasks.md` merge context, the draft task plan from the previous step, and task generation rules.
   - Load the previous step's draft task plan from Previous Response or current run reports: `draft_artifacts.tasks`, `## draft_artifacts.tasks`, `## Draft tasks.md`, `kiro-spec-tasks-result.md`, `kiro-spec-tasks-repair-result.md`, `kiro-spec-quick-tasks-result.md`, or `kiro-spec-quick-tasks-repair-result.md`.
   - In draft review mode, the review target is fixed to the tasks draft. Do not treat git diff, the current dirty worktree, or uncommitted workflow/facet/script/test changes as the task plan review target.
   - If this review targets git diff, the current dirty worktree, unrelated workflow/facet/script/test changes, or any artifact other than the tasks draft, return `task_plan_review: "NEEDS_FIXES"` and `fatal_review_issue: "REVIEW_TARGET_SCOPE_MISMATCH"`, and report `review_target_scope_mismatch`.
   - If the draft body is missing, return `task_plan_review: "NEEDS_FIXES"`, `fatal_review_issue: "MISSING_DRAFT_ARTIFACT"`, and report `missing_draft_artifact`. Do not fall back to an existing `tasks.md`, git diff, or another phase artifact.
2. Run the task plan review gate from `$kiro-spec-tasks` or `/kiro-spec-tasks` Step 3.
3. Run the task-graph sanity review described in `$kiro-spec-tasks` or `/kiro-spec-tasks` Step 3.5.
4. Return `task_plan_review: "PASS"` and `task_graph_sanity_review: "PASS"` only when both reviews pass.
5. Return `NEEDS_FIXES` in the relevant review field and `fatal_review_issue: "NONE"` when findings are local to the task plan and can be repaired without requirements/design changes.
6. Return `RETURN_TO_DESIGN` in the relevant review field when the review exposes a real requirements/design gap or contradiction.

## Result mapping

- On pass, report the checked coverage, executability, dependency graph, boundary ownership, and `(P)` marker evidence without changing artifacts.
- In `(P)` marker evidence, always verify that each `(P)` task has `_Depends:_ none`. A `(P)` task with non-empty dependencies is an invalid `(P)` marker and must return `task_graph_sanity_review: "NEEDS_FIXES"` or `"BLOCKED"`.
- On needs-fix or blocked, include concrete findings and keep `tasks.md` and `spec.json` unchanged.

## AI quality gate evidence

- Inspect the current run's namespaced AI gate review report before returning task plan review pass:
  `reports/subworkflows/iteration-*--step-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  or `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`.
- Confirm that the AI gate report includes `review_target: tasks_draft` or equivalent explicit evidence.
- If the AI gate report targeted git diff, the current dirty worktree, unrelated workflow/facet/script/test changes, or another phase artifact, return `task_plan_review: "NEEDS_FIXES"` and `fatal_review_issue: "AI_GATE_SCOPE_MISMATCH"`, and report `ai_gate_scope_mismatch`. Do not treat this as a locally repairable task draft issue.
- If the AI gate report includes `review_target: git_diff`, unscoped git diff, or `git diff` without a path filter as evidence, also return `fatal_review_issue: "AI_GATE_SCOPE_MISMATCH"`.
- Reject the draft task plan when unresolved AI antipattern findings remain.
- If the corresponding namespaced `kiro-spec-ai-antipattern-fix.md` exists, reject stale, cross-run, blocked, or evidence-free no-fix outcomes.
- Treat the missing `kiro-spec-ai-antipattern-fix.md` as valid only when the first review found no blocking issue; it is an optional fix report, not a required success artifact.
- Route rejected AI gate evidence through `NEEDS_FIXES` or `RETURN_TO_DESIGN` instead of accepting the task graph.
