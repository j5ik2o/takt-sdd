---
extends_skill: kiro-spec-design
extends_skill_section: "## Execution Steps"
---

{extends: architect}

# Kiro Spec Design Instruction

## Kiro-specific delta

Generate `.kiro/specs/<feature>/design.md` and `.kiro/specs/<feature>/research.md` from approved Kiro requirements. The success state is `design-generated`, with `spec.json` setting `approvals.requirements.approved` and `approvals.design.generated` to true. Keep this phase limited to DesignGenerationWorkflow responsibilities.

## Inputs

- `.kiro/specs/<feature>/spec.json` in the `requirements-generated` phase or a later compatible phase.
- `.kiro/specs/<feature>/requirements.md`.
- Optional existing `design.md` and `research.md` for merge mode.
- Relevant `.kiro/steering/*.md` steering context and codebase patterns.
- Design rules for discovery/research, design synthesis, and the design review gate.

## Design generation procedure

1. Resolve the canonical feature directory as `.kiro/specs/<feature>/`.
2. Run the requirements approval gate before generating design output. If requirements are not approved, return `validation.verdict: "BLOCKED"` unless `-y` or `auto-approve` mode is explicitly active.
3. When `-y` or `auto-approve` mode is active, explicitly update `approvals.requirements.approved: true` in the finalize step of the successful design phase; do not imply approval silently.
4. Perform discovery/research from `requirements.md`, `spec.json`, relevant steering context, existing `design.md`, optional `research.md`, and code patterns before design synthesis.
5. Write or update `research.md` with discovery findings, synthesis decisions, investigated alternatives, and risks that shaped the design.
6. Apply design synthesis after discovery/research. Record build-vs-adopt, simplification, and boundary decisions in `research.md`, then carry the implementation conclusions into `design.md`.
7. Draft `design.md` with these required sections:
   - `Boundary Commitments`
   - `File Structure Plan`
   - `Requirements Traceability`
8. In `Boundary Commitments`, state owned behavior, out-of-boundary behavior, allowed dependencies, and revalidation triggers.
9. In `File Structure Plan`, list concrete repository paths and the responsibility of each path. Do not leave undecided placeholders, placeholder-only entries, or vague ownership.
10. In `Requirements Traceability`, map every numeric requirement ID from `requirements.md` to concrete components, files, interfaces, or workflow decisions.
11. In generate/repair steps, do not run the final design review gate; make the drafts reviewable and route to the dedicated read-only review step. That review step checks coverage, architecture readiness, boundary readiness, File Structure Plan concreteness, and Requirements Traceability.
12. If a real requirements/design gap remains, return `validation.verdict: "BLOCKED"` or `validation.verdict: "NEEDS_FIX"` with findings and do not write the `design-generated` success state.
13. In the finalize step only, after the design review gate passes, keep `.kiro/specs/<feature>/design.md` and `.kiro/specs/<feature>/research.md` as accepted design artifacts.
14. In the finalize step only, update `.kiro/specs/<feature>/spec.json` in the same successful result:
   - `phase`: `design-generated`.
   - `approvals.requirements.approved`: true.
   - `approvals.design.generated`: true.
   - `approvals.design.approved`: unchanged unless explicit auto-approve or human approval applies.
   - `ready_for_implementation`: false.

## Result mapping

- In draft generation or repair steps, write or update `design.md` and `research.md` as draft artifacts for the read-only review step, but do not promote `spec.json` to `design-generated`. When the drafts are ready for review, return `phase: "design"`, `validation.verdict: "PASS"`, `draft_status: "READY_FOR_REVIEW"`, `review_gate: "PENDING"`, `featureName`, and `updatedFiles` containing `design.md` and `research.md` only.
- In finalize steps after the design review gate passed, return `phase: "design"`, `validation.verdict: "PASS"`, `draft_status: "WRITTEN"`, `review_gate: "PASSED"`, `featureName`, and `updatedFiles` containing `design.md`, `research.md`, and `spec.json`.
- On missing requirements, lifecycle inconsistency, failed requirements approval gate, failed design review gate, or requirements/design gap, return `BLOCKED` or `NEEDS_FIX` and keep `spec.json` out of the `design-generated` success state.
- `evidence` must mention requirements approval gate handling, `-y` or auto-approve handling, discovery/research sources, design synthesis, design review gate result, required sections, and whether `spec.json` was updated to `design-generated`.
