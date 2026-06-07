---
extends_skill: kiro-spec-requirements
extends_skill_section: "## Execution Steps"
---

{extends: review-requirements}

# Kiro Spec Requirements Instruction

## Kiro-specific delta

Generate `.kiro/specs/<feature>/requirements.md` from initialized Kiro context. The success state is `requirements-generated`, with `requirements.md` preserving EARS fixed phrases and numeric IDs, and `spec.json` setting `approvals.requirements.generated` to true. Keep this phase limited to requirements generation; do not decide design component, workflow YAML, or implementation file ownership.

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
4. Generate `requirements.md` with numeric IDs only. Do not use prefixes such as `REQ-`, alphabetic IDs, or unnumbered acceptance criteria.
5. Write each acceptance criterion with EARS fixed phrase structure:
   - `When [event] occurs, [system] shall [response]`
   - `If [condition], [system] shall [response]`
   - `If [unwanted event] occurs, [system] shall [response]`
   - `If [feature/option] is included, [system] shall [response]`
   - `[System] shall always [response]`
6. Run the requirements review gate before updating metadata. The gate must check EARS conformance, numeric IDs, testable acceptance criteria, duplicate or combined behavior, and remaining scope ambiguity.
7. If scope ambiguity remains or any acceptance criteria cannot be verified, return `validation.verdict: "BLOCKED"` or `validation.verdict: "NEEDS_FIX"` with `blockingReason` or findings. Do not advance to `requirements-generated`.
8. If the requirements review gate passes, write `.kiro/specs/<feature>/requirements.md`.
9. Update `.kiro/specs/<feature>/spec.json` in the same successful result:
   - `phase`: `requirements-generated`.
   - `approvals.requirements.generated`: true.
   - `approvals.requirements.approved`: unchanged unless explicit auto-approve or human approval applies.
   - `ready_for_implementation`: false.
10. Do not determine design component, workflow YAML, implementation file, task boundary, or dependency ownership in this phase.

## Result mapping

- In draft generation or repair steps, write or update `requirements.md` as a draft artifact for the read-only review step, but do not promote `spec.json` to `requirements-generated`. Return `draft_status: "READY_FOR_REVIEW"` and `review_gate: "PENDING"` when the draft is ready for review.
- On success, return `phase: "requirements"`, `validation.verdict: "PASS"`, `featureName`, and `updatedFiles` containing `requirements.md` and `spec.json`.
- In finalize steps after the requirements review gate passed, return `draft_status: "WRITTEN"` and `review_gate: "PASSED"` with the artifact updates.
- On lifecycle inconsistency, missing context, scope ambiguity, unverifiable acceptance criteria, or requirements review gate failure, return `BLOCKED` or `NEEDS_FIX` and keep `spec.json` out of the `requirements-generated` success state.
- `evidence` must mention the context loading sources, EARS and numeric IDs checks, requirements review gate result, and whether `spec.json` was updated to `requirements-generated`.
