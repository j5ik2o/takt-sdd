{extends: validation}

# Kiro Spec Generation Result Output Contract

## Machine Fields

- `phase`: one of `init`, `requirements`, `design`, `tasks`, or `quick`.
- `validation`: object with `verdict`, `evidence`, `findings`, and optional `sharedContractValidation`.
- `validation.verdict`: one of `PASS`, `NEEDS_FIX`, or `BLOCKED`.
- `draft_status`: lifecycle draft state when present; one of `READY_FOR_REVIEW` or `WRITTEN`.
- `review_gate`: one of `PENDING`, `PASSED`, `FAILED`, or `NOT_APPLICABLE`.
- `featureName`: canonical feature directory name under `.kiro/specs/<feature>`.
- `updatedFiles`: array of files written by the current step, using repository-relative paths.
- `nextAction`: optional next approval, correction, or phase command.
- `blockingReason`: required when `validation.verdict` is `BLOCKED`; omit or leave empty for `PASS`.

## Result Rules

- `PASS` means the current generation, repair, review, or finalize step succeeded for the reported `phase`; lifecycle promotion is determined by `draft_status` and `review_gate`.
- `READY_FOR_REVIEW` with `review_gate: PENDING` means draft artifacts are available for the dedicated read-only review step, but `spec.json` lifecycle promotion has not happened yet.
- `WRITTEN` with `review_gate: PASSED` means the finalize step wrote phase artifacts and lifecycle metadata after the review gate passed.
- `validation.verdict: NEEDS_FIX` means the phase produced reviewable output, but lifecycle metadata must not advance until the findings are corrected.
- `validation.verdict: BLOCKED` means the workflow could not safely write artifacts or advance lifecycle metadata.
- `updatedFiles` must include `spec.json` only when lifecycle metadata update succeeds.
- `blockingReason` must name the gate that stopped progress, such as phase gate, artifact write, metadata update, feature name conflict, ambiguity, or review gate.
