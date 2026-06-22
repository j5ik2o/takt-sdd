{extends: validation}

# Kiro Completion Verification Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines completion verification fields.

## Machine Fields

- `STATUS`: primary field from `kiro-verify-completion`; one of `VERIFIED`, `NOT_VERIFIED`, `MANUAL_VERIFY_REQUIRED`.
- `verdict`: optional legacy completion classification; one of `COMPLETE`, `INCOMPLETE`, `BLOCKED`.
- `completed_task_refs`: task references that can be marked complete.
- `remaining_work`: array of missing evidence, open findings, or unfinished work.
- `verification_evidence`: test, build, review, and manual verification facts.
- `manual_verification_reason`: required when `STATUS` is `MANUAL_VERIFY_REQUIRED`; describes the human evidence needed without treating it as blocked work.
- `blocked_reason`: required only when `verdict` is `BLOCKED`.
- `safe_to_update_progress`: boolean; true only when `STATUS` is `VERIFIED` and no remaining work exists.
- `summary`: human-readable completion explanation only; must not be used for workflow branching.

## Branching Rule

Workflow rules must branch on `STATUS` and `safe_to_update_progress`, not on `summary`.
