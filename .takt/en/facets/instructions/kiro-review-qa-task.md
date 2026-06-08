{extends: review-qa}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-review` or `/kiro-review` and read the resolved `SKILL.md`.
Apply the `## Outputs` section from `$kiro-review` or `/kiro-review` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro QA Review Adapter

## Kiro-Specific Delta

Review only the selected task implementation against requirements, acceptance criteria, task `_Requirements:_`, validation evidence, and actual diff.

Before forming the verdict, read `kiro-ai-antipattern-review.md`. Read `kiro-ai-antipattern-fix.md` only if that report exists in the current AI quality gate subworkflow run; it is optional because first-pass AI review approval does not create it. Treat unresolved AI antipattern findings, stale or cross-run fix evidence, a `NO_FIX_NEEDED` fix result without finding-level evidence, or `NEED_REPLAN` / `BLOCKED` fix results as selected-task QA findings.

## Output mapping

Return the `qa-review` format.

- `VERDICT`: `APPROVED` or `REJECTED`.
- `APPROVED`: Use only when selected task acceptance coverage, edge cases, error handling, manual verification requirements, and AI gate evidence are all acceptable.
- `REJECTED`: Use only when the selected task implementation has actionable QA findings.
- `FINDINGS`: Actionable findings tied to the selected task, requirement refs, and validation evidence.
- `MECHANICAL_RESULTS`: Validation command results, static checks, and manual verification notes.
- `SUMMARY`: Human-readable summary only.

The reviewer child step returns `VERDICT APPROVED` as condition `approved` and `VERDICT REJECTED` as condition `needs_fix`. The parent `reviewers` group aggregates only child conditions.
