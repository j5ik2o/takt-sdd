{extends: gather-review}

# Kiro Spec Status Reporting

## Kiro 固有差分

この instruction は読み取り専用です。`.kiro/specs/<feature>/` と `.kiro/steering/` は evidence source として読むだけにし、artifact の作成、更新、修復はしません。

## Status checks

1. `.kiro/specs/<feature>/` 配下の対象 feature directory を解決する。
2. `spec.json` がない場合は、`status: MISSING`、`readiness: NOT_READY`、`error_category: FEATURE_NOT_FOUND` を返す。
3. `spec.json` を読み、`phase`、`approvals`、`ready_for_implementation` を報告する。
4. phase artifact consistency を確認する:
   - `requirements-generated` は `requirements.md` を要求する。
   - `design-generated` は `requirements.md` と `design.md` を要求する。
   - `tasks-generated` は `requirements.md`、`design.md`、`tasks.md` を要求する。
5. phase artifact の不足は `error_category: ARTIFACT_MISSING` に写像する。
6. phase と approval state の矛盾は `error_category: LIFECYCLE_INCONSISTENT` に写像する。

## Output mapping

shared `kiro-status` contract を使う。machine field と `summary` を分離し、workflow rule は説明文で分岐しない。
