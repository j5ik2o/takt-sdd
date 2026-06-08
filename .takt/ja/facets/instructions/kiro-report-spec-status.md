{extends: gather-review}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-status` または `/kiro-spec-status` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-status` または `/kiro-spec-status` の `### Step 3: Generate Report` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Status Reporting

## Kiro 固有差分

この instruction は読み取り専用です。`.kiro/specs/<feature>/` と `.kiro/steering/` は evidence source として読むだけにし、artifact の作成、更新、修復はしません。

## Status checks

1. `.kiro/specs/<feature>/` 配下の対象 feature directory を解決する。
2. `spec.json` がない場合は、`status: MISSING`、`readiness: NOT_READY`、`error_category: FEATURE_NOT_FOUND` を返す。
3. `spec.json` を読めない、または JSON として invalid な場合は、`status: INVALID`、`readiness: INCONSISTENT`、`error_category: SPEC_JSON_INVALID` を返す。
4. valid な `spec.json` を読み、`status: FOUND` を設定し、`phase`、`approvals`、`ready_for_implementation` を報告する。
5. phase artifact consistency を確認する:
   - `initialized` は draft の `requirements.md` を要求する。
   - `requirements-generated` は `requirements.md` を要求する。
   - `design-generated` は `requirements.md` と `design.md` を要求する。
   - `tasks-generated` は `requirements.md`、`design.md`、`tasks.md` を要求する。
6. phase artifact の不足は `error_category: ARTIFACT_MISSING` に写像する。
7. phase と approval state の矛盾は `error_category: LIFECYCLE_INCONSISTENT` に写像する。
8. `status: FOUND` で、current phase が要求する artifact がすべて存在し、`ready_for_implementation` が true の場合だけ `readiness: READY` を返す。
9. feature は存在するが、current phase または approval が不整合なしに未完了の場合は `readiness: NOT_READY` を返す。
10. lifecycle または artifact state が `spec.json` と矛盾する場合は `readiness: INCONSISTENT` を返す。

## Output mapping

shared `kiro-status` contract を使う。machine field と `summary` を分離し、workflow rule は説明文で分岐しない。
