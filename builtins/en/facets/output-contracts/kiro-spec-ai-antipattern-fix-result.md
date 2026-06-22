---
id: kiro-spec-ai-antipattern-fix-result
kind: output-contract
name: Kiro Spec AI Antipattern Fix Result
version: 1.0.0
extends: validation
---

{extends: validation}

# Kiro Spec AI Antipattern Fix Result

Report the result of fixing AI antipattern findings for a generated Kiro spec draft before the normal domain review step runs.

## Required Machine Fields

- `STATUS`: one of `FIXED`, `NO_FIX_NEEDED`, `NEED_REPLAN`, or `BLOCKED`.
- `finding_decisions`: list each finding from `kiro-spec-ai-antipattern-review.md` and mark it as fixed, not applicable, requires replan, or blocked.
- `changed_files`: spec artifact files changed by this fix pass, or `none`.
- `scope_guard`: confirmation that the pass only touched the current spec artifact boundary.
- `validation_evidence`: checks, commands, or file-level evidence used to support the status.
- `no_fix_rationale`: required when `STATUS` is `NO_FIX_NEEDED`; include finding-level evidence.
- `missing_context`: required when `STATUS` is `NEED_REPLAN` or `BLOCKED`.
- `summary`: concise human-readable result.

## Status Semantics

- `FIXED`: at least one finding was corrected and the gate must run the AI antipattern review again.
- `NO_FIX_NEEDED`: every finding is shown to be inapplicable or already resolved with concrete evidence.
- `NEED_REPLAN`: the issue cannot be fixed safely within the current spec artifact boundary.
- `BLOCKED`: required information, files, or permissions are unavailable.

The report filename must be `kiro-spec-ai-antipattern-fix.md`.
