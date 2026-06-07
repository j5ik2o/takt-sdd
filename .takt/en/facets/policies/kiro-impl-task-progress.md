{extends: existing-system-respect}

# Kiro Implementation Task Progress Policy

Full custom reason: N/A; this facet extends existing-system-respect and narrows artifact writes for Kiro task progress.

## Progress gate

- Update only the selected task.
- A checkbox may change to `- [x]` only when completion `STATUS` is `VERIFIED` and `safe_to_update_progress` is true.
- `READY_FOR_REVIEW`, review `VERDICT APPROVED`, and validation evidence are necessary but not sufficient without completion verification.
- `BLOCK_TASK`, `STOP_FOR_HUMAN`, or `MANUAL_VERIFY_REQUIRED` writes a blocker note, not a completion checkbox.

## Artifact write boundary

- re-read the selected task section immediately before writing.
- Do not modify unrelated checkboxes, blocker notes, or implementation evidence.
- Keep `Implementation Notes` short and tied to observed evidence.
- If the selected task state changed, stop instead of overwriting another worker.
