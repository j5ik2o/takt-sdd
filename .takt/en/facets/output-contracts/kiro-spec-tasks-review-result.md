{extends: validation}

# Kiro Spec Tasks Review Result Output Contract

## Machine Fields

- `task_plan_review`: one of `PASS`, `NEEDS_FIXES`, or `RETURN_TO_DESIGN`.
- `task_graph_sanity_review`: one of `PASS`, `NEEDS_FIXES`, or `RETURN_TO_DESIGN`.
- `findings`: concrete task plan or task graph findings.
- `evidence`: coverage, executability, dependency graph, boundary ownership, and `(P)` marker evidence.
- `summary`: human-readable summary. Workflow rules must not branch on `summary`.

## Result Rules

- `PASS` means the corresponding review gate passed and the draft can move to finalization.
- `NEEDS_FIXES` means the issue is local to the task plan and can route to repair.
- `RETURN_TO_DESIGN` means the task review exposed a real requirements/design gap or contradiction and must abort this phase.
