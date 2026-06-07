{extends: validation}

# Kiro Implementation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines selected task implementation fields.

## Machine Fields

- `STATUS`: primary implementation field。`READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `changed_files`: selected taskで編集したfiles。
- `validation_evidence`: commands、exit codes、fresh outputs。
- `RED_PHASE_OUTPUT`: behavioral tasksのfailing test evidence、または `N/A`。
- `manual_verification_requirement`: automatic validation外に残るmanual checks。
- `missing_context`: `STATUS` が `NEEDS_CONTEXT` の場合のrequired context。
- `debug_context`: `STATUS` が `BLOCKED` の場合のfailure evidence。
- `summary`: human-readable explanationのみ。

## Branching Rule

workflow rulesは `STATUS` で分岐する。`summary` はroutingに使わない。
