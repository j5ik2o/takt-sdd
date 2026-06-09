{extends: review-test}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-review` or `/kiro-review` and read the resolved `SKILL.md`.
Apply the `## Outputs` section from `$kiro-review` or `/kiro-review` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Testing Review Adapter

## Kiro-Specific Delta

Review only the selected task implementation against RED_PHASE_OUTPUT, test changes, validation evidence, and actual diff.

Before forming the verdict, read `kiro-ai-antipattern-review.md`. Read `kiro-ai-antipattern-fix.md` only if that report exists in the current AI quality gate subworkflow run; it is optional because first-pass AI review approval does not create it. Treat unresolved AI antipattern findings, stale or cross-run fix evidence, a `NO_FIX_NEEDED` fix result without finding-level evidence, or `NEED_REPLAN` / `BLOCKED` fix results as selected-task testing findings.

## Output mapping

Return the `## Review Verdict` shape from `$kiro-review` or `/kiro-review`, specialized for testing concerns.

- `VERDICT`: `APPROVED` or `REJECTED`.
- `APPROVED`: Use only when RED phase evidence, test independence, deterministic fixtures, validation evidence, and AI gate evidence are all acceptable.
- `REJECTED`: Use only when the selected task implementation has actionable testing findings.
- `FINDINGS`: Actionable findings tied to the selected task, requirement refs, RED_PHASE_OUTPUT, and validation evidence.
- `MECHANICAL_RESULTS`: Validation command results, static checks, and test execution notes.
- `SUMMARY`: Human-readable summary only.

For TAKT routing only, map `VERDICT APPROVED` to child condition `approved` and `VERDICT REJECTED` to child condition `needs_fix`. The parent `reviewers` group aggregates only child conditions.
