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

Progress update is allowed only after `STATUS`, `VERDICT`, `NEXT_ACTION`, and completion `STATUS` have been resolved by upstream adapter steps.
