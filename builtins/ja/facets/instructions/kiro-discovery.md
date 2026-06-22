{extends: plan}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-discovery` または `/kiro-discovery` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-discovery` または `/kiro-discovery` の `## Step 2: Determine Action Path` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

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
6. roadmap の checklist marker は spec readiness だけを表す。新規または未承認 spec は `[ ]` とし、`[x]` は `spec.json.phase == "tasks-generated"`、requirements/design/tasks approvals、`ready_for_implementation == true`、required artifacts の存在を確認できる場合だけ使う。
7. implementation progress は `.kiro/specs/<feature>/tasks.md` の task checkbox で判断し、roadmap marker から実装完了を推定しない。
8. `MIXED_DECOMPOSITION` では既存 spec 更新と direct implementation candidate を `awarenessOnlyItems` に分離する。
9. action path または boundary ownership が曖昧な場合は、`blockingReason` を返し `createdFiles` を空に保つ。

## Brief Artifact Structure

discovery が `.kiro/specs/<feature>/brief.md` を書く場合、`$kiro-spec-init` または `/kiro-spec-init` が source of truth として読めるように次の section を正確に含める:

- `## Problem`
- `## Current State`
- `## Desired Outcome`
- `## Approach`
- `## Scope`
- `## Boundary Candidates`
- `## Out of Boundary`
- `## Upstream / Downstream`

brief は対象 feature に閉じる。既存 spec 更新や direct implementation candidate は、明示的に adjacent context として分離されていない限り、新規 feature brief に混ぜない。

## Output Mapping

- `actionPath`、`reason`、`createdFiles`、`plannedFiles`、`nextAction`、`blockingReason`、`awarenessOnlyItems` を含む `kiro-discovery-result` を返す。
- JSON key、path、script name、enum spelling は正確に維持する。
- OpenSpec artifacts を `.kiro/*` discovery artifact の source of truth に混ぜない。

## Discovery AI Gate Evidence

`report-discovery` が `SINGLE_SPEC`、`MULTI_SPEC`、`MIXED_DECOMPOSITION` の completion を返す前に、current run の namespaced subworkflow evidence を確認する:

- `reports/subworkflows/iteration-*--step-ai-quality-gate-discovery--workflow-kiro-discovery-ai-quality-gate/kiro-discovery-ai-antipattern-review.md`
- optional fix report: `reports/subworkflows/iteration-*--step-ai-quality-gate-discovery--workflow-kiro-discovery-ai-quality-gate/kiro-discovery-ai-antipattern-fix.md`

unresolved findings、stale evidence、cross-run evidence、evidence-free no-fix claims、または `kiro-ai-antipattern-review.md` や `kiro-spec-ai-antipattern-review.md` のような implementation/spec generation report names は complete と扱わない。first-pass `kiro-discovery-ai-antipattern-review.md` に blocking findings がない場合だけ、`kiro-discovery-ai-antipattern-fix.md` が missing でも許容する。
