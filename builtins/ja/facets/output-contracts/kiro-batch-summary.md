{extends: validation}

# Kiro Batch Summary Output Contract

## Machine Fields

- `wavePlan`: `## Specs (dependency order)` から作った dependency waves。
- `skippedSpecReady`: batch が skip した spec-ready roadmap entries。
- `featureResults`: `feature`、`status`、`generatedArtifacts`、`blockingReason`、`nextAction` を持つ worker result 配列。
- `failedFeatures`: `BLOCKED`、`NEEDS_FIX`、worker failure で終わった feature 配列。
- `awarenessOnlyItems`: worker dispatch から除外した既存 spec 更新と direct implementation candidates。
- `crossSpecReview`: cross-spec review の `verdict`、issue count、remaining issue categories の summary。
- `remediation`: local remediation attempts と re-review required の有無。
- `implementationReady`: worker success、cross-spec review pass、required remediation pass の後だけ true にできる boolean。
- `nextAction`: 次の human action または workflow action。

## Readiness Rules

- worker-local `ready_for_implementation` は input evidence にすぎない。それだけで batch-level `implementationReady` を true にしてはいけない。
- `failedFeatures` を伴う partial worker success は `implementationReady: false` を維持する。
- cross-spec review の `DECOMPOSITION_RETURN` は `implementationReady: false` を維持し、`nextAction` を roadmap/discovery に戻す。
- local remediation は follow-up cross-spec review が pass した後だけ `implementationReady: true` を許可する。
- `awarenessOnlyItems` は summary に残すが、cross-spec review が boundary absorption を見つけない限り batch readiness を block しない。
