{extends: validation}

# Kiro Implementation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines selected task implementation fields.

## Machine Fields

- `STATUS`: primary implementation field; one of `READY_FOR_REVIEW`, `BLOCKED`, `NEEDS_CONTEXT`.
- `changed_files`: files edited for the selected task.
- `validation_evidence`: commands, exit codes, and fresh outputs.
- `RED_PHASE_OUTPUT`: failing test evidence for behavioral tasks, or `N/A`.
- `manual_verification_requirement`: manual checks that remain outside automatic validation.
- `missing_context`: required context when `STATUS` is `NEEDS_CONTEXT`.
- `debug_context`: failure evidence when `STATUS` is `BLOCKED`.
- `summary`: human-readable explanation only.

## Branching Rule

Workflow rules branch on `STATUS`; `summary` is never used for routing.
