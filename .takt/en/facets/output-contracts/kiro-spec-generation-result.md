{extends: validation}

# Kiro Spec Generation Result Output Contract

## Machine Fields

- `phase`: one of `init`, `requirements`, `design`, `tasks`, or `quick`.
- `validation`: object with `verdict`, `evidence`, `findings`, and optional `sharedContractValidation`.
- `validation.verdict`: one of `PASS`, `NEEDS_FIX`, or `BLOCKED`.
- `featureName`: canonical feature directory name under `.kiro/specs/<feature>`.
- `updatedFiles`: array of files written by the completed phase, using repository-relative paths.
- `nextAction`: optional next approval, correction, or phase command.
- `blockingReason`: required when `validation.verdict` is `BLOCKED`; omit or leave empty for `PASS`.

## Result Rules

- `PASS` means the phase artifact write and `spec.json` metadata update succeeded for the reported `phase`.
- `NEEDS_FIX` means the phase produced reviewable output, but lifecycle metadata must not advance until the findings are corrected.
- `BLOCKED` means the workflow could not safely write artifacts or advance lifecycle metadata.
- `updatedFiles` must include `spec.json` when metadata update succeeds.
- `blockingReason` must name the gate that stopped progress, such as phase gate, artifact write, metadata update, feature name conflict, ambiguity, or review gate.
