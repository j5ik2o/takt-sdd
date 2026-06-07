{extends: validation}

# Kiro Implementation Result Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines selected task implementation fields.

## Machine Fields

- `STATUS`: primary implementation field; one of `READY_FOR_REVIEW`, `BLOCKED`, `NEEDS_CONTEXT`.
- `ready_for_implementation`: boolean readiness gate result for planning output.
- `selected_task`: the single task selected for this iteration, or `N/A` when no task can be selected.
- `blocker_note_required`: boolean indicating whether `update-progress` must write a selected-task blocker note.
- `implementation_plan`: selected task boundary, dependencies, requirement coverage, file scope, and validation commands.
- `task_set_status`: one of `ALL_TASKS_COMPLETE`, `REMAINING_TASKS_EXIST`, or `N/A`.
- `changed_files`: files edited for the selected task.
- `validation_evidence`: commands, exit codes, and fresh outputs.
- `RED_PHASE_OUTPUT`: failing test evidence for behavioral tasks, or `N/A`.
- `manual_verification_requirement`: manual checks that remain outside automatic validation.
- `missing_context`: required context when `STATUS` is `NEEDS_CONTEXT`.
- `debug_context`: failure evidence when `STATUS` is `BLOCKED`.
- `summary`: human-readable explanation only.

## Branching Rule

Workflow rules branch on `STATUS` plus the documented machine fields above; `summary` is never used for routing.
