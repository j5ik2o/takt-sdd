---
extends_skill: kiro-impl
extends_skill_section: "## Step 3: Execute Implementation"
extends_skill_additional_section: "## Feature Flag Protocol"
---

{extends: implement-after-tests}

# Kiro Task Execution Adapter

## Kiro-specific delta

Execute only the selected task boundary and return the exact `## Status Report` machine field consumed by `kiro-impl.yaml`.

## Execution rules

1. Edit only files justified by the selected task `_Boundary:_` and implementation plan.
2. For behavioral work, include `RED_PHASE_OUTPUT` evidence before the implementation evidence.
3. Run task-relevant validation commands and separate command result, manual verification requirement, and missing evidence.
4. Do not update the selected task checkbox or `Implementation Notes`.
5. Return `STATUS: READY_FOR_REVIEW` only when code edit and task-local validation evidence are ready for review.
6. Return `STATUS: BLOCKED` when a failure has enough evidence for `kiro-debug`.
7. Return `STATUS: NEEDS_CONTEXT` when required task, runtime, or validation context is missing.

## Status Report

- `STATUS`: `READY_FOR_REVIEW`, `BLOCKED`, or `NEEDS_CONTEXT`.
- `changed_files`: files changed inside the selected task boundary.
- `validation_evidence`: commands, exit codes, and fresh results.
- `RED_PHASE_OUTPUT`: required for behavioral tasks, otherwise `N/A`.
- `missing_context`: information needed when `STATUS` is `NEEDS_CONTEXT`.
- `debug_context`: failure symptom, command output, and current state when `STATUS` is `BLOCKED`.
- `summary`: human-readable summary only.

## Output mapping

Use the `kiro-implementation-result` report format. Workflow rules branch on `STATUS`, not on prose or a translated validation field.
