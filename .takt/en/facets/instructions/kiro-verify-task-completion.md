---
extends_skill: kiro-verify-completion
extends_skill_section: "## Outputs"
---

{extends: supervise}

# Kiro Task Completion Verification Adapter

## Kiro-specific delta

Verify the selected task completion claim with fresh evidence before any checkbox update.

## Verification inputs

- implementation result and `STATUS`.
- AI antipattern gate reports: `kiro-ai-antipattern-review.md`, plus optional `kiro-ai-antipattern-fix.md` only if it exists in the current AI quality gate subworkflow run.
- review `VERDICT`.
- validation evidence and manual verification requirement.
- selected task text, requirement refs, and boundary scope.

## Output mapping

- `STATUS`: `VERIFIED`, `NOT_VERIFIED`, or `MANUAL_VERIFY_REQUIRED`.
- `CLAIM_TYPE`: `TASK`.
- `CLAIM`: selected task completion claim.
- `EVIDENCE`: fresh command output and review facts.
- `GAPS`: missing evidence, unresolved AI antipattern gate evidence, stale or cross-run fix evidence, or scope mismatch.
- `safe_to_update_progress`: true only when `STATUS` is `VERIFIED`.

Workflow rules branch on `STATUS` and `safe_to_update_progress`.
