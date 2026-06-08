---
extends_skill: kiro-spec-requirements
extends_skill_section: "### Step 4: Review Requirements Draft"
---

{extends: review-requirements}

# Kiro Spec Requirements Review Instruction

## Kiro-specific delta

Review the draft `.kiro/specs/<feature>/requirements.md` before lifecycle metadata is promoted to `requirements-generated`. This adapter is read-only and must not finalize `spec.json`.

## Review procedure

1. Load the generated requirements draft, `spec.json`, steering context, and requirements rules.
2. Check EARS fixed phrases, numeric IDs, testable acceptance criteria, duplicate behavior, combined behavior, and remaining scope ambiguity.
3. Because this Kiro skill section does not define a dedicated uppercase review machine field, return `validation.verdict: "PASS"` only when the requirements review gate passed and the draft is ready for the finalize step.
4. Return `validation.verdict: "NEEDS_FIX"` when local repair is possible.
5. Return `validation.verdict: "BLOCKED"` when scope ambiguity or unverifiable acceptance criteria require human clarification.

## Result mapping

- On pass, report `requirements review gate passed` and do not update lifecycle metadata.
- On needs-fix or blocked, include concrete findings and keep `spec.json` out of the `requirements-generated` success state.

## AI quality gate evidence

- Inspect the current run's namespaced AI gate review report before accepting the draft:
  `reports/subworkflows/iteration-*--step-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  or `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`.
- Reject the draft when unresolved AI antipattern findings remain.
- If the corresponding namespaced `kiro-spec-ai-antipattern-fix.md` exists, reject stale, cross-run, blocked, or evidence-free no-fix outcomes.
- Treat the missing `kiro-spec-ai-antipattern-fix.md` as valid only when the first review found no blocking issue; it is an optional fix report, not a required success artifact.
- Route rejected AI gate evidence through the existing needs-fix or blocked result instead of accepting the draft.
