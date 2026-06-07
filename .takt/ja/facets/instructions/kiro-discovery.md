---
extends_skill: kiro-discovery
extends_skill_section: "## Step 2: Determine Action Path"
---

{extends: plan}

# Kiro Discovery Instruction

## Kiro-specific delta

利用者の作業依頼を Kiro discovery の `actionPath` に分類し、停止するか、`brief.md` を書くか、`.kiro/steering/roadmap.md` を更新するか、`blockingReason` を返すかを決めます。この adapter は routing と artifact planning に限定し、requirements、design、tasks、implementation edit は生成しません。

## Inputs

- 利用者の作業依頼と optional feature name hint。
- 既存 `.kiro/specs/*/spec.json` inventory。
- 存在する場合の `.kiro/steering/roadmap.md`。
- `.kiro/steering/` 配下の steering file existence。
- `kiro-discovery-routing` policy。

## Routing Procedure

1. spec inventory、roadmap presence、top-level structure から軽量な project context を集める。
2. `EXISTING_SPEC_UPDATE`、`DIRECT_IMPLEMENTATION`、`SINGLE_SPEC`、`MULTI_SPEC`、`MIXED_DECOMPOSITION` のいずれか 1 つの `actionPath` を選ぶ。
3. `EXISTING_SPEC_UPDATE` と `DIRECT_IMPLEMENTATION` では新しい discovery artifact を書かず、具体的な `nextAction` を返す。
4. `SINGLE_SPEC` では `.kiro/specs/<feature>/brief.md` を計画または作成する。
5. `MULTI_SPEC` と `MIXED_DECOMPOSITION` では `.kiro/steering/roadmap.md` と新規 spec ごとの `brief.md` を計画または作成する。
6. `MIXED_DECOMPOSITION` では既存 spec 更新と direct implementation candidate を `awarenessOnlyItems` に分離する。
7. action path または boundary ownership が曖昧な場合は、`blockingReason` を返し `createdFiles` を空に保つ。

## Output Mapping

- `actionPath`、`reason`、`createdFiles`、`plannedFiles`、`nextAction`、`blockingReason`、`awarenessOnlyItems` を含む `kiro-discovery-result` を返す。
- JSON key、path、script name、enum spelling は正確に維持する。
- OpenSpec artifacts を `.kiro/*` discovery artifact の source of truth に混ぜない。
