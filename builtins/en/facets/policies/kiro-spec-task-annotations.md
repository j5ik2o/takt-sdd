{extends: task-decomposition}

# Kiro Spec Task Annotation Policy

## Kiro-specific delta

This policy defines the task annotation contract consumed by downstream `kiro-impl`. It strengthens task decomposition by making `_Boundary:_` and `_Depends:_` mandatory for every executable task in `tasks.md`.

## Required annotations

Every executable task must include all of the following:

- Observable completion: at least one task detail bullet that describes the concrete completion signal.
- Numeric requirements: `_Requirements:_ ...` with numeric requirement IDs only.
- Boundary annotation: `_Boundary:_ ...`, using component or workflow boundary names from design.
- Depends annotation: `_Depends:_ ...`, using task IDs or the canonical empty dependency value `none`.

The annotation labels `_Boundary:_` and `_Depends:_` are required labels. Dependency-free executable task entries must write `_Depends:_ none`; `none` means an empty dependency set.

## Dependency graph and parallel marker

- Build an explicit dependency graph from every `_Depends:_ ...` annotation before approving the plan.
- Reject hidden prerequisite work that is not represented by a `_Depends:_ ...` edge or by being merged into the same task.
- Reject a task when its Boundary annotation overlaps another task in a way that would make file or workflow ownership ambiguous.
- Use `(P)` only when the non-overlapping boundary and dependency graph show no prerequisite, file, workflow, or shared artifact conflict.
- `(P)` is valid only together with `_Depends:_ none`. A task with non-empty dependencies has prerequisites and must not use `(P)`, even when its boundary does not overlap other tasks.
- Remove `(P)` from any task whose dependency graph, boundary, or observable completion depends on another incomplete task.

## Review gates

- Task plan review checks executable task size, observable completion, numeric requirements, requirement coverage, and hidden prerequisites.
- Task graph sanity review checks Boundary annotation coverage, Depends annotation coverage, dependency graph consistency, non-overlapping boundary, and `(P)` validity.
- If review finds missing `_Boundary:_`, missing `_Depends:_`, missing `none`, non-numeric requirements, no observable completion, boundary overlap, invalid dependency graph, or invalid `(P)`, return `NEEDS_FIX` or `BLOCKED`.
