---
extends_skill: kiro-review
extends_skill_section: "## Outputs"
---

{extends: review-coding}

# Kiro Task Review Adapter

## Kiro-specific delta

Review only the selected task implementation against requirements, design boundary, task `_Boundary:_`, validation evidence, and the actual diff.

Read `kiro-ai-antipattern-review.md` and `kiro-ai-antipattern-fix.md` before forming the verdict. Treat unresolved AI antipattern findings, missing finding-level `NO_FIX_NEEDED` evidence, or a `NEED_REPLAN` / `BLOCKED` fix result as review findings tied to the selected task.

## Output mapping

Return the `## Review Verdict` shape from `kiro-review`.

- `VERDICT`: `APPROVED` or `REJECTED`.
- `FINDINGS`: actionable findings tied to the selected task, requirement refs, and boundary evidence.
- `MECHANICAL_RESULTS`: validation command results, static checks, boundary audit, and RED phase status.
- `SUMMARY`: human-readable summary only.

Workflow rules branch on `VERDICT`; do not translate the result to another field.
