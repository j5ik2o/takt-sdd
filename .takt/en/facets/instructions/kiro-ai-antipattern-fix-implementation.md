---
id: kiro-ai-antipattern-fix-implementation
kind: instruction
name: Kiro AI Antipattern Fix Implementation
version: 1.0.0
Full custom skill reason: TAKT-side reusable AI antipattern gate instruction; no upstream Kiro skill owns this callable subworkflow role.
---

{extends: fix}

# Kiro AI Antipattern Fix Implementation

Full custom reason: TAKT-side reusable AI antipattern gate instruction; no upstream Kiro skill owns this callable subworkflow role.

Fix or adjudicate AI antipattern findings for the currently selected Kiro implementation task.

## Inputs

- Read `kiro-task-implementation-result.md` to identify the selected task, Implementation Notes, changed files, and validation evidence from the implementation step.
- Read `kiro-ai-antipattern-review.md` and handle every finding in that report.
- Use the current spec files under `.kiro/specs/<spec-name>/` as the authoritative task boundary.

## Scope

- Only change code or tests needed to address the selected task and the AI antipattern findings.
- Do not update `tasks.md`, roadmap markers, spec progress, or implementation progress artifacts.
- Do not start a different Kiro task.
- Do not use WebSearch or WebFetch. Learn from repository files and local TAKT/Kiro assets.

## Fix Rules

- Prefer small, direct corrections that remove hallucinated behavior, unsupported claims, missing repository evidence, or task-boundary drift.
- If a finding is valid and fixable inside the selected task, fix it and report `STATUS: FIXED`.
- If no code change is needed, report `STATUS: NO_FIX_NEEDED` only with finding-level evidence explaining why each finding is inapplicable or already resolved.
- If a finding requires changing the plan, requirements, design, or task decomposition, report `STATUS: NEED_REPLAN`.
- If required context is unavailable, report `STATUS: BLOCKED`.

## Output

Write `kiro-ai-antipattern-fix.md` using the `kiro-ai-antipattern-fix-result` contract.
