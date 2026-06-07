{extends: validation}

# Kiro Spec Sanity Review Output Contract

## Machine Fields

- `verdict`: one of `PASS`, `NEEDS_FIX`, or `BLOCKED`.
- `findings`: array of sanity review findings. Use an empty array when `verdict` is `PASS`.
- `findings[].finding_id`: stable machine id for the finding.
- `findings[].category`: one of `coherence`, `hidden prerequisite`, or `task annotation`.
- `findings[].artifact`: one of `requirements`, `design`, or `tasks`.
- `findings[].evidence`: repository-relative `file:line` or section evidence.
- `findings[].reason`: concise reason that explains the mismatch, missing prerequisite, or annotation drift.
- `findings[].required_action`: concrete correction required before completion.
- `requirements`: object with `status`, `evidence`, and optional `findings` for requirements coherence.
- `design`: object with `status`, `evidence`, and optional `findings` for design traceability and prerequisites.
- `tasks`: object with `status`, `evidence`, and optional `findings` for task annotation coverage.
- `fix_targets`: array of machine-readable correction targets. Each item must include `artifact`, `path`, `finding_id`, and `required_action`.
- `blockingReason`: required when `verdict` is `BLOCKED`; omit or leave empty for `PASS`.

## Verdict Rules

- `PASS` means requirements, design, and tasks are coherent; no hidden prerequisite is required; task annotation coverage is complete.
- `NEEDS_FIX` means at least one fix target exists in requirements, design, or tasks, but the workflow can continue after local repair.
- `BLOCKED` means the quick path cannot safely report completion because an artifact is missing, a prerequisite is outside the quick path boundary, or the correction target is ambiguous.
- Every `NEEDS_FIX` or `BLOCKED` result must include at least one `findings` item and at least one `fix_targets` item.

## Branching Rules

- Workflow rules must branch on `verdict`, not on `summary`.
- `PASS` is the only verdict that can allow quick workflow completion.
- `NEEDS_FIX` must route to correction using `fix_targets`.
- `BLOCKED` must stop the quick workflow and report `blockingReason`.
