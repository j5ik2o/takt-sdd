{extends: validation}

# Kiro Batch Summary Output Contract

## Machine Fields

- `wavePlan`: dependency waves built from `## Specs (dependency order)`.
- `skippedCompleted`: completed roadmap specs skipped by the batch.
- `featureResults`: array of worker results with `feature`, `status`, `generatedArtifacts`, `blockingReason`, and `nextAction`.
- `failedFeatures`: array of features that ended in `BLOCKED`, `NEEDS_FIX`, or worker failure.
- `awarenessOnlyItems`: existing spec updates and direct implementation candidates excluded from worker dispatch.
- `crossSpecReview`: summary of cross-spec review `verdict`, issue count, and remaining issue categories.
- `remediation`: local remediation attempts and whether re-review is required.
- `implementationReady`: boolean that can be true only after worker success, cross-spec review pass, and required remediation pass.
- `nextAction`: next human or workflow action.

## Readiness Rules

- worker-local `ready_for_implementation` is input evidence only. It must not by itself set batch-level `implementationReady`.
- Partial worker success with `failedFeatures` must keep `implementationReady: false`.
- `DECOMPOSITION_RETURN` from cross-spec review must keep `implementationReady: false` and route `nextAction` to roadmap/discovery.
- Local remediation may set `implementationReady: true` only after the follow-up cross-spec review passes.
- `awarenessOnlyItems` remain visible in the summary but do not block batch readiness unless cross-spec review finds boundary absorption.
