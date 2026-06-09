{extends: validation}

# Kiro Spec Tasks Review Result Output Contract

## Machine Fields

- `task_plan_review`: one of `PASS`, `NEEDS_FIXES`, or `RETURN_TO_DESIGN`.
- `task_graph_sanity_review`: one of `PASS`, `NEEDS_FIXES`, or `RETURN_TO_DESIGN`.
- `fatal_review_issue`: one of `NONE`, `AI_GATE_SCOPE_MISMATCH`, `REVIEW_TARGET_SCOPE_MISMATCH`, or `MISSING_DRAFT_ARTIFACT`.
- `findings`: concrete task plan or task graph findings.
- `evidence`: coverage, executability, dependency graph, boundary ownership, and `(P)` marker evidence.
- `summary`: human-readable summary. Workflow rules must not branch on `summary`.

## Result Rules

- `PASS` means the corresponding review gate passed and the draft can move to finalization.
- `NEEDS_FIXES` means the issue is local to the task plan and can route to repair.
- `RETURN_TO_DESIGN` means the task review exposed a real requirements/design gap or contradiction and must abort this phase.
- `fatal_review_issue` is `NONE` for locally repairable task plan issues; set it to the matching non-local issue enum when the workflow must abort instead of repairing.
