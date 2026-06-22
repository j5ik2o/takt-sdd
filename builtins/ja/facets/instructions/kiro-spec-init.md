{extends: plan}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-init` または `/kiro-spec-init` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-init` または `/kiro-spec-init` の `## Execution Steps` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Init Instruction

## Kiro 固有差分

`.kiro/specs/<feature>/` を 1 つだけ初期化する。完了状態は `initialized` であり、`spec.json` と draft `requirements.md` が整合して書かれていること。この phase は spec initialization に限定し、roadmap や OpenSpec artifacts は更新しない。

## Inputs

- `featureName` または invocation から得た feature name candidate。
- invocation description。
- optional の `.kiro/specs/<feature>/brief.md`。
- `.kiro/settings/templates/specs/init.json` と `.kiro/settings/templates/specs/requirements-init.md` の template guidance。

## Initialization procedure

1. canonical feature directory を `.kiro/specs/<feature>/` として解決する。
2. description source を選ぶ。
   - `brief.md` が存在する場合、description source は `brief.md` とする。
   - 存在しない場合、description source は invocation description とする。
3. 対象 directory が brief-only directory なら再利用する。brief-only directory は `brief.md` だけを含み、initialized 済みの `spec.json`、`requirements.md`、`design.md`、`tasks.md` を含まない directory である。
4. feature directory が既に `spec.json`、`requirements.md`、`design.md`、`tasks.md` のいずれかを含む場合、feature name conflict として扱う。既存 spec を上書きせず、`validation.verdict: "BLOCKED"` と `blockingReason: "feature name conflict"` を返す。
5. 初期 `spec.json` には `.kiro/settings/templates/specs/init.json`、draft `requirements.md` には `.kiro/settings/templates/specs/requirements-init.md` の template guidance を読む。必要な template または local equivalent が見つからない場合、新しい構造を推測せず template finding 付きの `BLOCKED` を返す。
6. `.kiro/specs/<feature>/spec.json` に次の initialized state を書く。
   - `feature_name`: canonical feature name。
   - `phase`: `initialized`。
   - `approvals.requirements.generated`: false。
   - `approvals.requirements.approved`: false。
   - `approvals.design.generated`: false。
   - `approvals.design.approved`: false。
   - `approvals.tasks.generated`: false。
   - `approvals.tasks.approved`: false。
   - `ready_for_implementation`: false。
7. 選択した description source と template から draft `.kiro/specs/<feature>/requirements.md` を書く。draft は未完成でよいが、requirements がまだ generated/approved ではないことを明確にする。
8. `brief.md` が存在する場合は変更せず保持する。
9. init 中に `.kiro/steering/roadmap.md`、`roadmap.md`、`openspec/`、その他の OpenSpec artifact を編集しない。

## Result mapping

- 成功時は `phase: "init"`、`validation.verdict: "PASS"`、`featureName`、`updatedFiles` に `spec.json` と `requirements.md` を含め、`nextAction` は `kiro-spec-requirements` を指す。
- feature name conflict、template 問題、description source の欠落、安全でない artifact write がある場合は `validation.verdict: "BLOCKED"` を返し、`updatedFiles` は空、または安全に書けた file だけに限定する。
- evidence には resolved description source、brief-only directory を再利用したか、使用した template source、roadmap/OpenSpec artifacts を更新していないことを記録する。
