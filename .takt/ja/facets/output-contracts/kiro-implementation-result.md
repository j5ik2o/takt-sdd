{extends: validation}

# Kiro Implementation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines selected task implementation fields.

## Machine Fields

- `STATUS`: primary implementation field。`READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `ready_for_implementation`: planning outputで使うboolean readiness gate result。
- `selected_task`: このiterationで選択したsingle task。選択できない場合は `N/A`。
- `blocker_note_required`: `update-progress` がselected-task blocker noteを書く必要があるかを示すboolean。
- `implementation_plan`: selected taskのboundary、dependencies、requirement coverage、file scope、validation commands。
- `baseline_dirty_files`: planning時点の既存未コミットfiles。selected task diffの一部ではない。
- `task_set_status`: `ALL_TASKS_COMPLETE`、`REMAINING_TASKS_EXIST`、`N/A` のいずれか。executable leaf task checkboxだけから導出し、group header checkboxは含めない。
- `changed_files`: selected taskで編集したfiles。
- `validation_evidence`: commands、exit codes、fresh outputs。
- `RED_PHASE_OUTPUT`: behavioral tasksのfailing test evidence、または `N/A`。
- `manual_verification_requirement`: automatic validation外に残るmanual checks。
- `missing_context`: `STATUS` が `NEEDS_CONTEXT` の場合のrequired context。
- `debug_context`: `STATUS` が `BLOCKED` の場合のfailure evidence。
- `summary`: human-readable explanationのみ。

## Branching Rule

workflow rulesは `STATUS` と上記machine fieldsで分岐する。`summary` はroutingに使わない。
