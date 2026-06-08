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

## Scope

- Change only files that belong to the current spec artifact boundary.
- Do not silently edit upstream phases, roadmap decomposition, implementation progress, or unrelated artifacts.
- Do not update `tasks.md` implementation progress checkboxes.
- Do not start implementation work.

## Fix Rules

- If a finding is valid and fixable inside the current spec artifact boundary, fix it and report `STATUS: FIXED`.
- If every finding is inapplicable or already resolved with concrete evidence, report `STATUS: NO_FIX_NEEDED`.
- If a finding requires changing an upstream phase, roadmap decomposition, task boundaries, or the approved plan, report `STATUS: NEED_REPLAN`.
- If required context, files, or permissions are unavailable, report `STATUS: BLOCKED`.
- Preserve finding-level evidence for every decision.

## Output

Write `kiro-spec-ai-antipattern-fix.md` using the `kiro-spec-ai-antipattern-fix-result` contract.
