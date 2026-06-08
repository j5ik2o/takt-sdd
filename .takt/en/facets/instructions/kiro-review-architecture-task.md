{extends: review-arch}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-review` or `/kiro-review` and read the resolved `SKILL.md`.
Apply the `## Outputs` section from `$kiro-review` or `/kiro-review` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Architecture Review Adapter

## Kiro-Specific Delta

Review only the selected task implementation against requirements, design boundary, task `_Boundary:_`, actual diff, and fresh validation evidence.

Before forming the verdict, read `kiro-ai-antipattern-review.md`. Read `kiro-ai-antipattern-fix.md` only if that report exists in the current AI quality gate subworkflow run; it is optional because first-pass AI review approval does not create it. Treat unresolved AI antipattern findings, stale or cross-run fix evidence, a `NO_FIX_NEEDED` fix result without finding-level evidence, or `NEED_REPLAN` / `BLOCKED` fix results as selected-task architecture findings.

## Output mapping

Return the `architecture-review` format.

- `VERDICT`: `APPROVED` or `REJECTED`.
- `APPROVED`: Use only when the Kiro selected task boundary, design boundary, dependency direction, scope guard, and AI gate evidence are all acceptable.
- `REJECTED`: Use only when the selected task implementation has actionable architecture findings.
- `FINDINGS`: Actionable findings tied to the selected task, requirement refs, and boundary evidence.
- `MECHANICAL_RESULTS`: Validation command results, static checks, and boundary audit.
- `SUMMARY`: Human-readable summary only.

The reviewer child step returns `VERDICT APPROVED` as condition `approved` and `VERDICT REJECTED` as condition `needs_fix`. The parent `reviewers` group aggregates only child conditions.
