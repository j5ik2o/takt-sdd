{extends: review-arch}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-validate-design` or `/kiro-validate-design` and read the resolved `SKILL.md`.
Apply the `## Execution Steps` section from `$kiro-validate-design` or `/kiro-validate-design` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Design Validation Readiness

## Kiro-specific delta

This instruction is read-only. In standalone validation, inspect `requirements.md`, `design.md`, optional `research.md`, and `spec.json`; do not modify design artifacts. During `kiro-spec-design` or `kiro-spec-quick` generation review, treat the step as draft review mode because `design.md` has not been written yet.

## Draft review mode

- When the active workflow is `kiro-spec-design` or `kiro-spec-quick` and the previous generation / repair result has `phase: "design"`, `draft_status: "READY_FOR_REVIEW"`, and `review_gate: "PENDING"`, the review target is the current run's draft report, not `.kiro/specs/<feature>/design.md`.
- Find the draft report in the current Report Directory or Previous Response in this order: `kiro-spec-design-result.md`, `kiro-spec-design-repair-result.md`, `kiro-spec-quick-design-result.md`, `kiro-spec-quick-design-repair-result.md`.
- Treat `draft_artifacts.design`, `draft_artifacts.research`, or Markdown headings named `## design.md draft` / `## research.md draft` as the design draft / research draft.
- In draft review mode, the review target is fixed to the design draft. Do not treat the git diff, current dirty worktree, or uncommitted workflow/facet/script/test changes as the design review target.
- If you run `git diff`, always add a path filter for `.kiro/specs/<feature>/` or the current run report path. Unscoped git diff, meaning `git diff` without a path filter, is forbidden in draft review mode.
- If the draft body cannot be loaded, do not fall back to git diff, `.kiro/specs/<feature>/design.md`, or another phase artifact.
- In draft review mode, it is valid for `spec.json` to remain at `phase: "requirements-generated"` with `approvals.design.generated: false`. Do not classify that state as `ARTIFACT_MISSING` or `LIFECYCLE_INCONSISTENT`.
- If no draft body is available, return `DECISION: MANUAL_VERIFY_REQUIRED` or `DECISION: NO-GO` and report `missing_draft_artifact`. Do not require a nonexistent `.kiro/specs/<feature>/design.md`.
- If the review targeted the git diff, current dirty worktree, or unrelated workflow/facet changes instead of the design draft, return `DECISION: NO-GO` and report `review_target_scope_mismatch`. Do not treat this state as local repair possible.

## Validation procedure

1. Verify that requirements and design artifacts exist and that approvals do not contradict the current phase. In draft review mode, treat the design draft from the draft report as the design artifact.
2. Check requirements coverage against the design traceability table.
3. Check Boundary Commitments, Out of Boundary, Allowed Dependencies, and Revalidation Triggers.
4. Check the File Structure Plan against the component mapping.
5. Check validation hooks and repository-local test strategy.
6. If downstream responsibility is absorbed by this design, return `DECISION: NO-GO` with a boundary violation finding.

## Output mapping

Use the shared `kiro-validation-result` contract. Translate the inherited skill's GO/NO-GO readiness determination into an explicit `DECISION: <GO|NO-GO|MANUAL_VERIFY_REQUIRED>` line; do not return a bare GO/NO-GO verdict without the `DECISION` machine field. Always set `DECISION` as the primary workflow-routing field: `GO` for design readiness, `NO-GO` for lifecycle failure or design drift, and `MANUAL_VERIFY_REQUIRED` when evidence cannot be confirmed automatically.

## AI quality gate evidence

- Inspect the current run's namespaced AI gate review report before returning `DECISION: GO`:
  `reports/subworkflows/iteration-*--step-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  or `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`.
- In draft review mode, verify that the AI gate report targeted the design draft. The report must include `review_target: design_draft` or equivalent explicit evidence. If the report targeted another phase such as a requirements draft, return `DECISION: NO-GO` and report `ai_gate_scope_mismatch`.
- In draft review mode, if the AI gate report targeted the git diff, current dirty worktree, or unrelated workflow/facet changes, also return `DECISION: NO-GO` and report `ai_gate_scope_mismatch`. Do not treat this state as local repair possible.
- If the AI gate report contains `review_target: git_diff`, unscoped git diff, or `git diff` without a path filter as evidence, return `DECISION: NO-GO` and report `ai_gate_scope_mismatch`.
- If the active workflow is standalone `kiro-validate-design` and no `kiro-spec-ai-antipattern-review.md` exists in the current run, skip the AI quality gate evidence check and use the normal validation procedure only; that read-only workflow does not execute the gate.
- If a generation review workflow such as `kiro-spec-design` or `kiro-spec-quick` lacks `kiro-spec-ai-antipattern-review.md`, return `DECISION: MANUAL_VERIFY_REQUIRED` instead of accepting design readiness.
- Return `DECISION: NO-GO` when unresolved AI antipattern findings remain.
- If the corresponding namespaced `kiro-spec-ai-antipattern-fix.md` exists, reject stale, cross-run, blocked, or evidence-free no-fix outcomes.
- Treat the missing `kiro-spec-ai-antipattern-fix.md` as valid only when the first review found no blocking issue; it is an optional fix report, not a required success artifact.
- Route rejected AI gate evidence through the existing `NO-GO` or `MANUAL_VERIFY_REQUIRED` result instead of accepting design readiness.
