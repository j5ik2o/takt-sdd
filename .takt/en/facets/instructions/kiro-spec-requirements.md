{extends: review-pure}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-spec-requirements` or `/kiro-spec-requirements` and read the resolved `SKILL.md`.
Apply the `## Execution Steps` section from `$kiro-spec-requirements` or `/kiro-spec-requirements` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Spec Requirements Instruction

## Kiro-specific delta

Generate requirements content from initialized Kiro context. The final success state is `requirements-generated`, with `requirements.md` preserving EARS fixed phrases and numeric IDs, and `spec.json` setting `approvals.requirements.generated` to true. Keep this phase limited to requirements generation; do not decide design component, workflow YAML, or implementation file ownership.

## Inputs

- `.kiro/specs/<feature>/spec.json` in the `initialized` phase.
- Optional `.kiro/specs/<feature>/brief.md`.
- The existing draft `requirements.md`.
- Relevant `.kiro/steering/*.md` steering context.
- Requirements rules from `cc-sdd-ears-format`, `kiro-spec-generation`, and `kiro-spec-lifecycle`.

## Requirements generation procedure

1. Resolve the canonical feature directory as `.kiro/specs/<feature>/`.
2. Perform context loading from `brief.md`, the existing draft `requirements.md`, `spec.json`, relevant steering context, and requirements rules before writing.
3. If `spec.json` is missing, unreadable, or not in an initialized state that can advance to `requirements-generated`, return `validation.verdict: "BLOCKED"` and do not write success metadata.
4. Generate draft requirements content with numeric IDs only. Do not use prefixes such as `REQ-`, alphabetic IDs, or unnumbered acceptance criteria.
5. Write each acceptance criterion with EARS fixed phrase structure:
   - `When [event] occurs, [system] shall [response]`
   - `If [condition], [system] shall [response]`
   - `If [unwanted event] occurs, [system] shall [response]`
   - `If [feature/option] is included, [system] shall [response]`
   - `[System] shall always [response]`
6. In generate/repair steps, do not run the final requirements review gate; make the draft reviewable and route to the dedicated read-only review step. That review step checks EARS conformance, numeric IDs, testable acceptance criteria, duplicate or combined behavior, and remaining scope ambiguity.
7. If scope ambiguity remains or any acceptance criteria cannot be verified, return `validation.verdict: "BLOCKED"` or `validation.verdict: "NEEDS_FIX"` with `blockingReason` or findings. Do not advance to `requirements-generated`.
8. In the finalize step only, after the requirements review gate passes, keep `.kiro/specs/<feature>/requirements.md` as the accepted requirements artifact.
9. In the finalize step only, update `.kiro/specs/<feature>/spec.json` in the same successful result:
   - `phase`: `requirements-generated`.
   - `approvals.requirements.generated`: true.
   - `approvals.requirements.approved`: unchanged unless explicit auto-approve or human approval applies.
   - `ready_for_implementation`: false.
10. Do not determine design component, workflow YAML, implementation file, task boundary, or dependency ownership in this phase.

## Result mapping

- In draft generation or repair steps, return draft requirements content in the step report for the read-only review step; do not write `requirements.md` or promote `spec.json` to `requirements-generated`. When the draft is ready for review, return `phase: "requirements"`, `validation.verdict: "PASS"`, `draft_status: "READY_FOR_REVIEW"`, `review_gate: "PENDING"`, `featureName`, and an empty `updatedFiles` array.
- In finalize steps after the requirements review gate passed, return `phase: "requirements"`, `validation.verdict: "PASS"`, `draft_status: "WRITTEN"`, `review_gate: "PASSED"`, `featureName`, and `updatedFiles` containing `requirements.md` and `spec.json`.
- On lifecycle inconsistency, missing context, scope ambiguity, unverifiable acceptance criteria, or requirements review gate failure, return `BLOCKED` or `NEEDS_FIX` and keep `spec.json` out of the `requirements-generated` success state.
- `evidence` must mention the context loading sources, EARS and numeric IDs checks, requirements review gate result, and whether `spec.json` was updated to `requirements-generated`.
