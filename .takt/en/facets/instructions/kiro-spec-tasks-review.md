{extends: review-requirements}

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
2. Run the task plan review gate from `$kiro-spec-tasks` or `/kiro-spec-tasks` Step 3.
3. Run the task-graph sanity review described in `$kiro-spec-tasks` or `/kiro-spec-tasks` Step 3.5.
4. Return `task_plan_review: "PASS"` and `task_graph_sanity_review: "PASS"` only when both reviews pass.
5. Return `NEEDS_FIXES` in the relevant review field when findings are local to the task plan and can be repaired without requirements/design changes.
6. Return `RETURN_TO_DESIGN` in the relevant review field when the review exposes a real requirements/design gap or contradiction.

## Result mapping

- On pass, report the checked coverage, executability, dependency graph, boundary ownership, and `(P)` marker evidence without changing artifacts.
- On needs-fix or blocked, include concrete findings and keep `tasks.md` and `spec.json` unchanged.

## AI quality gate evidence

- Inspect the current run's namespaced AI gate review report before returning task plan review pass:
  `reports/subworkflows/iteration-*--step-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  or `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`.
- Reject the draft task plan when unresolved AI antipattern findings remain.
- If the corresponding namespaced `kiro-spec-ai-antipattern-fix.md` exists, reject stale, cross-run, blocked, or evidence-free no-fix outcomes.
- Treat the missing `kiro-spec-ai-antipattern-fix.md` as valid only when the first review found no blocking issue; it is an optional fix report, not a required success artifact.
- Route rejected AI gate evidence through `NEEDS_FIXES` or `RETURN_TO_DESIGN` instead of accepting the task graph.
