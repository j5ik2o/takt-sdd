---
id: kiro-discovery-ai-antipattern-fix-result
kind: output-contract
name: Kiro Discovery AI Antipattern Fix Result
version: 1.0.0
extends: validation
---

{extends: validation}

# Kiro Discovery AI Antipattern Fix Result

Report the result of fixing AI antipattern findings for Kiro discovery artifacts before `report-discovery` runs.

## Required Machine Fields

- `STATUS`: one of `FIXED`, `NO_FIX_NEEDED`, `NEED_REPLAN`, or `BLOCKED`.
- `finding_decisions`: list each finding from `kiro-discovery-ai-antipattern-review.md` and mark it as fixed, not applicable, requires replan, or blocked.
- `changed_files`: discovery artifact files changed by this fix pass, or `none`.
- `scope_guard`: confirmation that the pass only touched the current discovery artifact boundary.
- `validation_evidence`: checks, commands, or file-level evidence used to support the status.
- `no_fix_rationale`: required when `STATUS` is `NO_FIX_NEEDED`; include finding-level evidence.
- `missing_context`: required when `STATUS` is `NEED_REPLAN` or `BLOCKED`.
- `summary`: concise human-readable result.

## Status Semantics

- `FIXED`: at least one finding was corrected and the gate must run the AI antipattern review again.
- `NO_FIX_NEEDED`: every finding is shown to be inapplicable or already resolved with concrete evidence.
- `NEED_REPLAN`: the issue cannot be fixed safely within the current discovery artifact boundary.
- `BLOCKED`: required information, files, or permissions are unavailable.

The report filename must be `kiro-discovery-ai-antipattern-fix.md`. The report is an `optional fix report` when the first-pass `kiro-discovery-ai-antipattern-review.md` has no blocking findings.
