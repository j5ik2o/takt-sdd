# Kiro Artifact Operations Policy

Full custom reason: built-in policies do not define `.kiro/steering` and `.kiro/specs/<feature>` artifact lifecycle boundaries.

## Steering Reads

- workflow routing、dependency order、batch context に project memory が必要な場合は `.kiro/steering/roadmap.md` を読む。
- `.kiro/steering/*.md` は存在するものだけを、workflow boundary に必要な範囲で読む。
- optional steering file がないことは `ARTIFACT_MISSING` ではない。

## Feature Resolution

- feature は `.kiro/specs/<feature>/` で解決する。
- `brief.md` は discovery context であり、spec initialization 後は optional。
- feature 初期化後は `spec.json` が必須。
- feature directory がない場合は `FEATURE_NOT_FOUND`。

## Phase Artifacts

- `requirements-generated` は `requirements.md` を必要とする。
- `design-generated` は `requirements.md` と `design.md` を必要とする。`research.md` は optional supplemental input。
- `tasks-generated` は `requirements.md`、`design.md`、`tasks.md`、`spec.json` を必要とする。
- 必須 artifact がない場合は `ARTIFACT_MISSING`。
- `spec.json` が読めない、または invalid な場合は `SPEC_JSON_INVALID`。
- phase、approvals、artifact presence が矛盾する場合は `LIFECYCLE_INCONSISTENT`。

## Boundary

`openspec/` 配下の OpenSpec artifacts は `.kiro/*` artifact contract に含めない。
