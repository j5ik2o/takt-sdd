{extends: task-decomposition}

# Kiro Roadmap Dependency Waves Policy

## Roadmap Structure

`kiro-discovery` may create or update `.kiro/steering/roadmap.md` with these project-level sections:

- `## Overview`
- `## Approach Decision`
- `## Scope`
- `## Constraints`
- `## Boundary Strategy`
- `## Specs (dependency order)`

Only `## Specs (dependency order)` is authoritative for `kiro-spec-batch` wave execution. Each batch entry must use this shape:

```text
- [ ] feature-name -- One-line description. Dependencies: none
- [ ] downstream-feature -- One-line description. Dependencies: feature-name
```

`Dependencies: none` means the feature can enter the first wave when it is spec pending.

## Roadmap Marker Semantics

Roadmap checklist markers represent spec readiness. They must not represent implementation completion.

- `[x]` is the spec ready marker. Use it only when all of this evidence is true:
  - `spec.json.phase == "tasks-generated"`
  - `approvals.requirements.generated == true`
  - `approvals.requirements.approved == true`
  - `approvals.design.generated == true`
  - `approvals.design.approved == true`
  - `approvals.tasks.generated == true`
  - `approvals.tasks.approved == true`
  - `ready_for_implementation == true`
  - `.kiro/specs/<feature>/requirements.md` exists
  - `.kiro/specs/<feature>/design.md` exists
  - `.kiro/specs/<feature>/tasks.md` exists
- `[ ]` is the spec not ready / spec pending marker.
- Read implementation progress from task checkboxes in `.kiro/specs/<feature>/tasks.md`, not from roadmap markers.
- Roadmap markers do not represent implementation completion. The mere existence of `tasks.md` must not mark a roadmap entry `[x]`.

## Awareness-Only Sections

The following sections may appear in roadmap as context, but they are awareness-only and must not be parsed into dependency waves:

- `## Existing Spec Updates`
- `## Direct Implementation Candidates`

These sections can affect review context and sequencing advice, but they are not worker dispatch inputs and do not require `brief.md` creation.

## Blocking Conditions

- Missing `## Specs (dependency order)` blocks batch execution.
- Empty `## Specs (dependency order)` blocks batch execution as `missing roadmap spec entries`.
- Invalid dependency-order checklist lines block batch execution as `invalid roadmap spec entry`.
- Duplicate dependency-order feature names block batch execution as `duplicate roadmap spec entry`.
- Missing dependency names block batch execution.
- `circular dependency` blocks batch execution.
- Unknown readiness markers block batch execution.
- Pending specs without `.kiro/specs/<feature>/brief.md` block worker dispatch.
- Empty, invalid, or duplicate roadmap parse states must not be treated as `all roadmap specs spec-ready`.
