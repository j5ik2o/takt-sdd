---
id: kiro-ai-antipattern-fix-spec-generation
kind: instruction
name: Kiro AI Antipattern Fix Spec Generation
version: 1.0.0
Full custom skill reason: TAKT-side reusable AI antipattern gate instruction for generated Kiro spec drafts.
---

{extends: fix}

# Kiro AI Antipattern Fix Spec Generation

Fix or adjudicate AI antipattern findings for the current generated Kiro spec draft.

## Inputs

- Read `kiro-spec-ai-antipattern-review.md` and handle every finding in that report.
- Use the current spec files under `.kiro/specs/<feature>/` as the authoritative current spec artifact boundary.
- Use the active phase context from the caller workflow to determine whether the draft is requirements, design, or tasks.
- In design phase with `draft_status: READY_FOR_REVIEW`, it is normal that `design.md` / `research.md` have not been written yet. Fix `draft_artifacts.design` / `draft_artifacts.research`, or the `## design.md draft` / `## research.md draft` sections from Previous Response or the caller phase result report.
- In tasks phase with `draft_status: READY_FOR_REVIEW`, it is normal that `tasks.md` has not been written yet. Fix `draft_artifacts.tasks`, `## draft_artifacts.tasks`, or `## Draft tasks.md` from Previous Response or the caller phase result report.

## Scope

- Change only files that belong to the current spec artifact boundary.
- Do not silently edit upstream phases, roadmap decomposition, implementation progress, or unrelated artifacts.
- In design phase draft review mode, findings whose review target shifted to git diff, current dirty worktree, unrelated workflow/facet changes, or another phase artifact are not current spec draft findings and must not be fixed.
- In tasks phase draft review mode, findings whose review target shifted to git diff, current dirty worktree, unrelated workflow/facet/script/test changes, or another phase artifact are not current spec draft findings and must not be fixed.
- Do not update `tasks.md` implementation progress checkboxes.
- Do not start implementation work.
- When fixing a design draft before finalize, do not create `.kiro/specs/<feature>/design.md` or advance lifecycle metadata. Return the corrected draft in the response/report for the finalize step.
- When fixing a tasks draft before finalize, do not create `.kiro/specs/<feature>/tasks.md` or advance lifecycle metadata. Return the corrected draft in the response/report for the finalize step.

## Fix Rules

- If a finding is valid and fixable inside the current spec artifact boundary, fix it and report `STATUS: FIXED`.
- If every finding is inapplicable or already resolved with concrete evidence, report `STATUS: NO_FIX_NEEDED`.
- If a finding requires changing an upstream phase, roadmap decomposition, task boundaries, or the approved plan, report `STATUS: NEED_REPLAN`.
- If required context, files, or permissions are unavailable, report `STATUS: BLOCKED`.
- For `missing_draft_artifact`, `ai_gate_scope_mismatch`, `review_target_scope_mismatch`, or findings against unrelated git diff / current dirty worktree, do not perform a local fix; report `STATUS: NEED_REPLAN`.
- Preserve finding-level evidence for every decision.

## Output

Write `kiro-spec-ai-antipattern-fix.md` using the `kiro-spec-ai-antipattern-fix-result` contract.
