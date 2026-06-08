---
id: kiro-ai-antipattern-fix-discovery
kind: instruction
name: Kiro AI Antipattern Fix Discovery
version: 1.0.0
Full custom skill reason: TAKT-side reusable AI antipattern gate instruction for Kiro discovery artifacts.
---

{extends: fix}

# Kiro AI Antipattern Fix Discovery

Fix or adjudicate AI antipattern findings for the current Kiro discovery artifact boundary.

## Inputs

- Read `kiro-discovery-ai-antipattern-review.md` and handle every finding in that report.
- Use the active discovery output as the authoritative boundary: `.kiro/specs/<feature>/brief.md` and `.kiro/steering/roadmap.md` entries created or updated by the current `kiro-discovery` run.
- Treat the caller workflow actionPath as authoritative for whether discovery artifacts are expected.

## Scope

- Change only current discovery artifacts: `brief.md` files for newly discovered specs and the matching `.kiro/steering/roadmap.md` decomposition entries.
- Do not edit requirements.md, design.md, tasks.md, spec.json approval state, implementation files, upstream skills, or existing spec-owned artifacts.
- Do not update roadmap checkbox markers as implementation progress.
- Do not start implementation work.

## Fix Rules

- If a finding is valid and fixable inside the current discovery artifact boundary, fix it and report `STATUS: FIXED`.
- If every finding is inapplicable or already resolved with concrete evidence, report `STATUS: NO_FIX_NEEDED`.
- If a finding requires changing requirements/design/tasks artifacts, existing spec ownership, implementation files, or upstream Kiro skill behavior, report `STATUS: NEED_REPLAN`.
- If required context, files, or permissions are unavailable, report `STATUS: BLOCKED`.
- Preserve finding-level evidence for every decision.

## Output

Write `kiro-discovery-ai-antipattern-fix.md` using the `kiro-discovery-ai-antipattern-fix-result` contract.
