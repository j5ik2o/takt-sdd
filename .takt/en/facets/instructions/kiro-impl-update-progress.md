---
extends_skill: kiro-impl
extends_skill_section: "### Manual Mode (main context)"
---

{extends: fix}

# Kiro Progress Update Adapter

## Kiro-specific delta

Update only the selected task progress after completion verification or blocker decision. The selected task section must be re-read immediately before writing.

## Update rules

1. When completion `STATUS` is `VERIFIED` and `safe_to_update_progress` is true, change only the selected task checkbox to `- [x]`.
2. Append or update implementation evidence and `Implementation Notes` only inside the selected task or the shared notes section.
3. When `BLOCK_TASK`, `STOP_FOR_HUMAN`, or nonproductive monitor handling reaches this step, do not check the checkbox; write a blocker note for the selected task.
4. If the selected task state changed after planning, stop instead of overwriting another worker.
5. Never update unrelated task checkboxes, blocker notes, or completion evidence.

## Output mapping

After writing `tasks.md`, emit one of these machine statuses for workflow routing:

- `STATUS: READY_FOR_REVIEW` when the selected task checkbox or blocker note was updated successfully and the workflow may move to the next gate.
- `STATUS: BLOCKED` when the selected task cannot be updated safely, including stale task state or missing write evidence.
- `STATUS: NEEDS_CONTEXT` when human input is required before any progress or blocker note can be written.

Progress update is allowed only after planning, debug, or completion adapter steps have resolved the selected task and write intent.
