{extends: implement-after-tests}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-impl` or `/kiro-impl` and read the resolved `SKILL.md`.
Apply the `## Step 3: Execute Implementation` section from `$kiro-impl` or `/kiro-impl` as this step's source of truth.
Also read the `## Feature Flag Protocol` section.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Task Execution Adapter

## Kiro-specific delta

Execute only the selected task boundary and return the exact `## Status Report` machine field consumed by `kiro-impl.yaml`.

## Execution rules

1. Edit only files justified by the selected task `_Boundary:_` and implementation plan.
2. For behavioral work, include `RED_PHASE_OUTPUT` evidence before the implementation evidence.
3. Run task-relevant validation commands and separate command result, manual verification requirement, and missing evidence.
4. Do not update the selected task checkbox or `Implementation Notes`.
5. Preserve the planning report's `baseline_dirty_files`, and list only files edited for the selected task in `changed_files`.
6. Return `STATUS: READY_FOR_REVIEW` only when code edit and task-local validation evidence are ready for review.
7. Return `STATUS: BLOCKED` when a failure has enough evidence for `$kiro-debug` or `/kiro-debug`.
8. Return `STATUS: NEEDS_CONTEXT` when required task, runtime, or validation context is missing.

## Status Report

- `STATUS`: `READY_FOR_REVIEW`, `BLOCKED`, or `NEEDS_CONTEXT`.
- `baseline_dirty_files`: pre-existing dirty files captured during planning.
- `changed_files`: files changed inside the selected task boundary.
- `validation_evidence`: commands, exit codes, and fresh results.
- `RED_PHASE_OUTPUT`: required for behavioral tasks, otherwise `N/A`.
- `missing_context`: information needed when `STATUS` is `NEEDS_CONTEXT`.
- `debug_context`: failure symptom, command output, and current state when `STATUS` is `BLOCKED`.
- `summary`: human-readable summary only.

## Command gate vs debug routing

After the code edit completes, the command quality gate (`verify.sh`) runs at the end of this step. If the gate exits non-zero, takt feeds the failure output back to **this same execute-task step for remediation** (takt-native mechanism). This is a distinct layer from the debug-task route triggered by review or verify failures — it introduces no custom retry counter, and re-execution bounds remain governed only by `loop_monitors` (Requirement 2).

## Output mapping

Use the `kiro-implementation-result` report format. Workflow rules branch on `STATUS`, not on prose or a translated validation field.
