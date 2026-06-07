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

`Dependencies: none` means the feature can enter the first wave unless it is already complete.

## Awareness-Only Sections

The following sections may appear in roadmap as context, but they are awareness-only and must not be parsed into dependency waves:

- `## Existing Spec Updates`
- `## Direct Implementation Candidates`

These sections can affect review context and sequencing advice, but they are not worker dispatch inputs and do not require `brief.md` creation.

## Blocking Conditions

- Missing `## Specs (dependency order)` blocks batch execution.
- Missing dependency names block batch execution.
- `circular dependency` blocks batch execution.
- Unknown completion markers block batch execution.
- Pending specs without `.kiro/specs/<feature>/brief.md` block worker dispatch.
