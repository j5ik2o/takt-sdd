---
extends_skill: kiro-spec-batch
extends_skill_section: "## Step 4: Cross-Spec Review"
---

{extends: review-arch}

# Kiro Cross-Spec Review Instruction

## Kiro-specific delta

Review generated specs after batch worker dispatch. Focus on cross-spec consistency that individual generation workflows cannot prove locally.

## Inputs

- `.kiro/steering/roadmap.md`.
- Generated `.kiro/specs/*/design.md` as primary architecture input.
- Generated `.kiro/specs/*/requirements.md` for scope and acceptance criteria.
- Generated `.kiro/specs/*/tasks.md` for `_Boundary:_` annotations.
- Worker feature results and skipped spec-ready entries from `kiro-spec-batch`.

## Review Checks

- data model consistency across generated specs.
- interface alignment between upstream and downstream specs.
- duplicate functionality and ownership overlap.
- dependency completeness against roadmap dependency order.
- naming conventions across components, paths, and contract fields.
- shared infrastructure ownership.
- task boundary alignment between `_Boundary:_` annotations and roadmap dependency direction.

## Output Mapping

- Return `kiro-cross-spec-review` with `verdict`, `issues`, `severity`, `affectedSpecs`, `suggestedFix`, `repairTarget`, and optional `DECOMPOSITION_RETURN`.
- Use `DECOMPOSITION_RETURN` when the issue is a decomposition or roadmap boundary problem rather than a local patch.
- Keep the review read-only. Remediation is routed by `coordinate-remediation`.
