{extends: validation}

# Kiro Discovery Result Output Contract

## Machine Fields

- `actionPath`: `EXISTING_SPEC_UPDATE`、`DIRECT_IMPLEMENTATION`、`SINGLE_SPEC`、`MULTI_SPEC`、`MIXED_DECOMPOSITION` のいずれか。
- `reason`: 簡潔な routing 理由。
- `createdFiles`: discovery が作成または更新した repository-relative path の配列。
- `plannedFiles`: downstream workflow が存在を期待する repository-relative path の配列。
- `nextAction`: `kiro-spec-init`、`kiro-spec-batch`、`kiro-spec-requirements`、direct implementation などの次 action。
- `blockingReason`: discovery が安全に action path を選べない、または artifact を書けない場合に必須。
- `awarenessOnlyItems`: batch dependency wave に入れてはいけない既存 spec 更新または direct implementation candidate。
- `briefSections`: `.kiro/specs/<feature>/brief.md` を作成する場合の required section heading。

## Result Rules

- `EXISTING_SPEC_UPDATE` と `DIRECT_IMPLEMENTATION` は通常 `createdFiles` を空にし、具体的な `nextAction` を返す。
- `SINGLE_SPEC` は対象 feature の `brief.md` を `createdFiles` または `plannedFiles` に含める。
- `MULTI_SPEC` と `MIXED_DECOMPOSITION` は `.kiro/steering/roadmap.md` と新規 spec ごとの `brief.md` を含める。
- `MIXED_DECOMPOSITION` は既存 spec 更新と direct implementation candidate を `awarenessOnlyItems` に分離し、`awarenessOnlyItems non-empty` を満たす。
- `blockingReason` が存在する場合、downstream spec generation を開始してはいけない。

## Brief Contract

`.kiro/specs/<feature>/brief.md` が `createdFiles` または `plannedFiles` に含まれる場合、`briefSections` は次を含める:

- `## Problem`
- `## Current State`
- `## Desired Outcome`
- `## Approach`
- `## Scope`
- `## Boundary Candidates`
- `## Out of Boundary`
- `## Upstream / Downstream`
