{extends: plan}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-requirements` または `/kiro-spec-requirements` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-requirements` または `/kiro-spec-requirements` の `## Execution Steps` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Requirements Instruction

## Kiro 固有差分

initialized 済みの Kiro context から requirements content を生成する。final success state は `requirements-generated` であり、`requirements.md` は EARS fixed phrase と numeric IDs を保持し、`spec.json` は `approvals.requirements.generated` を true にする。この phase は requirements generation に限定し、design component、workflow YAML、implementation file の ownership は決めない。

## Inputs

- `initialized` phase の `.kiro/specs/<feature>/spec.json`。
- optional の `.kiro/specs/<feature>/brief.md`。
- existing draft `requirements.md`。
- 関連する `.kiro/steering/*.md` の steering context。
- `cc-sdd-ears-format`、`kiro-spec-generation`、`kiro-spec-lifecycle` の requirements rules。

## Requirements generation procedure

1. canonical feature directory を `.kiro/specs/<feature>/` として解決する。
2. 書き込み前に `brief.md`、existing draft `requirements.md`、`spec.json`、関連する steering context、requirements rules から context loading を行う。
3. `spec.json` が存在しない、読めない、または `requirements-generated` へ進める initialized state でない場合は `validation.verdict: "BLOCKED"` を返し、success metadata を書かない。
4. draft requirements content は numeric IDs のみで生成する。`REQ-` prefix、alphabetic IDs、番号なし acceptance criteria は使わない。
5. acceptance criteria は `rules/ears-format.md` の EARS fixed phrase に沿って書く。各 criterion は、対象言語の固定句と必須表現を本文中に文字列として含める。日本語では固定句を「するとき」「ならば」「含まれる場合」などに置き換えず、必須表現も「示さなければならない」「扱わなければならない」のように活用せず `しなければならない` または `し続けなければならない` を含める。
   - `[イベント] が起きたとき、[システム] は [応答] しなければならない`
   - `[前提] の間、[システム] は [応答] し続けなければならない`
   - `[条件/異常] の場合、[システム] は [応答] しなければならない`
   - `[機能/オプション] を含む場合、[システム] は [応答] しなければならない`
   - `[システム] は常に [応答] しなければならない`
6. generate/repair step では final requirements review gate を実行しない。draft を review 可能にして dedicated read-only review step へ進める。その review step が EARS 準拠、numeric IDs、検証可能な acceptance criteria、重複または結合された振る舞い、残存する scope ambiguity を確認する。
7. scope ambiguity が残る、または acceptance criteria を検証できない場合は `blockingReason` または findings を付けて `validation.verdict: "BLOCKED"` または `validation.verdict: "NEEDS_FIX"` を返す。`requirements-generated` へ進めない。
8. finalize step でのみ、requirements review gate 通過後に `.kiro/specs/<feature>/requirements.md` を accepted requirements artifact として扱う。
9. finalize step でのみ、同じ成功 result で `.kiro/specs/<feature>/spec.json` を更新する。
   - `phase`: `requirements-generated`。
   - `approvals.requirements.generated`: true。
   - `approvals.requirements.approved`: 明示的な auto-approve または human approval がない限り変更しない。
   - `ready_for_implementation`: false。
10. この phase では design component、workflow YAML、implementation file、task boundary、dependency ownership を決めない。

## Result mapping

- draft generation または repair step では read-only review step が読む draft requirements content を step report に返す。`requirements.md` は書かず、`spec.json` も `requirements-generated` へ promotion してはならない。draft が review に進める場合は `phase: "requirements"`、`validation.verdict: "PASS"`、`draft_status: "READY_FOR_REVIEW"`、`review_gate: "PENDING"`、`featureName`、空の `updatedFiles` array を返す。
- requirements review gate 通過後の finalize step では、`phase: "requirements"`、`validation.verdict: "PASS"`、`draft_status: "WRITTEN"`、`review_gate: "PASSED"`、`featureName`、`updatedFiles` に `requirements.md` と `spec.json` を含めて返す。
- lifecycle inconsistency、missing context、scope ambiguity、検証不能な acceptance criteria、requirements review gate failure がある場合は `BLOCKED` または `NEEDS_FIX` を返し、`spec.json` を `requirements-generated` success state にしない。
- evidence には context loading source、EARS と numeric IDs の確認、requirements review gate result、`spec.json` を `requirements-generated` に更新したかを記録する。
