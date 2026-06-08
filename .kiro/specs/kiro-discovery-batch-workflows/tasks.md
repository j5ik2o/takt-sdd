# Implementation Plan

- [x] 1. discovery/batch workflow の validation harness を追加する
  - `kiro-discovery`、`kiro-spec-batch`、関連 facet、output contract、roadmap parser fixture を検証できる repository-local check を追加する。
  - downstream `kiro-impl` や individual generation body が未実装でも failure にしない scope guard を含める。
  - 完了時点で missing workflow/facet、action path enum drift、cross-spec output contract drift が validation finding として確認できる。
  - _Requirements: 1.5, 6.1, 6.2, 6.4, 6.5_
  - _Boundary:_ DiscoveryBatchValidationHarness
  - _Depends:_ none

- [x] 2. discovery routing policy と result contract を追加する
  - existing spec update、direct implementation、single spec、multi-spec、mixed decomposition の action path を policy と output contract に定義する。
  - selected action path、reason、created files、next action、blocking reason を machine-readable にする。
  - 完了時点で discovery が新規 spec generation を開始すべきケースと止めるべきケースを同じ contract から判定できる。
  - _Requirements: 1.1, 1.4, 1.5, 2.5_
  - _Boundary:_ DiscoveryRoutingPolicy, DiscoveryArtifactPlanner
  - _Depends:_ 1

- [x] 3. `kiro-discovery` workflow と instruction facet を追加する
  - work request、既存 `.kiro/specs/`、roadmap、steering context を読み、routing policy に従って action path を選ぶ。
  - existing/direct path では artifact write なしの next action を返し、single/multi/mixed path では artifact planning に進む。
  - 完了時点で曖昧な request は `BLOCKED` 相当で止まり、推測で roadmap や brief が確定されない。
  - _Requirements: 1.1, 1.4, 2.4_
  - _Boundary:_ DiscoveryWorkflow
  - _Depends:_ 2

- [x] 4. `brief.md` artifact structure と write path を追加する
  - problem、current state、desired outcome、approach、scope、boundary candidates、out of boundary、upstream/downstream を含む brief structure を定義する。
  - single/multi/mixed の対象 feature directory に `brief.md` を作成する workflow step を接続する。
  - 完了時点で後続 `kiro-spec-init` が brief を source of truth として読める。
  - _Requirements: 1.2, 2.1, 2.4_
  - _Boundary:_ DiscoveryArtifactPlanner
  - _Depends:_ 3

- [x] 5. roadmap artifact planning と awareness-only section handling を追加する
  - multi-spec と mixed decomposition で `.kiro/steering/roadmap.md` に overview、approach、scope、constraints、boundary strategy、`## Specs (dependency order)` を残す。
  - `Existing Spec Updates` と `Direct Implementation Candidates` を awareness-only として記録し、batch 対象にしない policy を追加する。
  - 完了時点で roadmap から batch 対象 feature と awareness-only item を区別できる。
  - _Requirements: 1.3, 2.2, 2.3, 2.5_
  - _Boundary:_ DiscoveryArtifactPlanner, RoadmapDependencyParser
  - _Depends:_ 4

- [x] 6. roadmap dependency parser を実装する
  - `## Specs (dependency order)` の checklist entry から feature、description、dependencies、completion status を抽出する。
  - circular dependency、missing dependency、unknown completion marker を blocking result にする。
  - 完了時点で parser fixture から pending/completed specs と dependency error が再現できる。
  - _Requirements: 2.2, 2.3, 3.1, 3.3, 6.2_
  - _Boundary:_ RoadmapDependencyParser
  - _Depends:_ 5

- [x] 7. batch wave planner を追加する
  - pending specs を、dependencies が完了済みまたは先行 wave に属する feature ごとの dependency wave に分類する。
  - pending feature の `brief.md` existence を wave execution 前に確認する。
  - 完了時点で missing brief と dependency cycle は worker dispatch 前に報告される。
  - _Requirements: 3.2, 3.3, 3.4_
  - _Boundary:_ BatchWavePlanner
  - _Depends:_ 6

- [x] 8. `kiro-spec-batch` workflow と worker dispatch を追加する
  - roadmap parse、wave plan、same-wave worker dispatch、strict wave ordering、feature result aggregation を workflow に接続する。
  - worker は `kiro-spec-generation-workflows` の init、requirements、design、tasks phase を呼び出し、feature directory に閉じて更新する。
  - 完了時点で同じ wave の success/failure が feature result として保持され、次 wave は前 wave 完了後にだけ開始される。
  - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.3_
  - _Boundary:_ BatchWorkerDispatcher
  - _Depends:_ 7

- [x] 9. batch summary と remediation coordinator を追加する
  - wave plan、skipped completed specs、worker results、failed features、awareness-only items、next action を summary contract に定義する。
  - generation failure と review issue を区別し、局所修正、再 review、roadmap/discovery return の routing を持たせる。
  - 完了時点で partial success を成功扱いにせず、feature ごとの状態と残作業が利用者に見える。
  - cross-spec review と必要な remediation が完了するまで、worker-local `ready_for_implementation` を batch summary の implementation-ready signal として扱わない。
  - _Requirements: 4.2, 4.4, 5.4, 5.5, 5.6_
  - _Boundary:_ BatchRemediationCoordinator
  - _Depends:_ 8, 10

- [x] 10. cross-spec review instruction と output contract を追加する
  - generated specs の requirements、design、tasks、roadmap を読む review instruction を追加する。
  - data model consistency、interface alignment、duplicate functionality、dependency completeness、naming、shared infrastructure ownership、task boundary alignment を issue category にする。
  - 完了時点で review result が severity、affected specs、suggested fix、decomposition return を machine-readable に返す。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_
  - _Boundary:_ CrossSpecReviewWorkflow
  - _Depends:_ 8

- [x] 11. discovery/batch workflow の en/ja language pair をそろえる
  - 追加した workflow、instruction、policy、output contract の en/ja basename と machine field をそろえる。
  - 日本語 facet は自然な日本語にし、path、script 名、enum、field name は shared contract と一致させる。
  - 完了時点で片言語だけの追加や enum drift が validation failure として見える。
  - _Requirements: 1.5, 6.1, 6.4_
  - _Boundary:_ DiscoveryWorkflow, BatchWorkerDispatcher, CrossSpecReviewWorkflow, DiscoveryBatchValidationHarness
  - _Depends:_ 2, 3, 8, 9, 10

- [x] 12. repository-local test command に discovery/batch validation を接続する
  - validation script を test runner から実行できる regression test として接続する。
  - roadmap parser fixture、workflow/facet parity、generation workflow reference、cross-spec output contract、scope guard をまとめて検証する。
  - 完了時点で discovery/batch workflow の drift が通常検証で検出できる。
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Boundary:_ DiscoveryBatchValidationHarness
  - _Depends:_ 6, 8, 9, 10, 11

- [x] 13. discovery/batch facets の built-in 継承候補を棚卸しする
  - `node_modules/takt/builtins/{en,ja}/facets` の research、planning、review 系 facet を確認し、各 Kiro-specific discovery/batch facet の親候補を記録する。
  - 親候補がある facet は shared `BuiltinFacetInheritancePolicy` の `extends` を使い、action path、roadmap dependency wave、cross-spec review だけを差分として記述する。
  - 親候補がない、または full custom が必要な facet は理由を design note または validation finding に残す。
  - 完了時点で discovery/batch validation harness が親 facet 不在、runtime 未対応、全文コピー前提を検出できる。
  - _Requirements: 6.6_
  - _Boundary:_ DiscoveryBatchValidationHarness
  - _Depends:_ 2, 3, 8, 9, 10, 11, 12

- [x] 14. Kiro skill thin adapter へ discovery/batch facets を再整合する
  - `kiro-discovery` と `kiro-spec-batch` の instruction facet に `extends_skill` と `extends_skill_section` を持たせる。
  - Kiro skill 本文をコピーせず、TAKT artifact input、worker dispatch input、output summary、rule condition だけを差分として記述する。
  - `kiro-spec-batch` を quick path ではなく roadmap dependency-wave controller として扱う。
  - en/ja adapter facet の skill section、machine field、enum が一致することを validation に追加する。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.2_
  - _Boundary:_ DiscoveryRoutingWorkflow, BatchWorkflow, DiscoveryBatchValidationHarness
  - _Depends:_ 13

- [x] 15. dynamic worker dispatch と cross-spec remediation loop を実装する
  - wave 内 feature を static TAKT step に展開せず、batch worker dispatch step が dynamic subagent input と result aggregation を管理する。
  - worker は `kiro-spec-generation-workflows` の phase contract と adapter を参照し、batch workflow は requirements/design/tasks 本文生成を再実装しない。
  - cross-spec review issue を affected specs、issue category、repair target、roadmap/decomposition return として machine-readable に返す。
  - local remediation と再 review を `loop_monitors.threshold: 3` で制御し、独自 retry counter を持たせない。
  - remediation で解消しない issue または decomposition issue がある場合は implementation-ready を確定しない。
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - _Boundary:_ BatchWavePlanner, BatchWorkerDispatcher, CrossSpecReviewWorkflow, BatchRemediationCoordinator
  - _Depends:_ 14

- [x] 16. unreleased discovery/batch workflow/facet を削除または再作成する
  - `.takt/{en,ja}/workflows/kiro-discovery.yaml` と `kiro-spec-batch.yaml` が単一 prompt step wrapper の場合は削除し、closed-loop workflow として再作成する。
  - `workflow_call`、shell `takt -w`、workflow-to-workflow 再起動で phase reuse している箇所を排除する。
  - TAKT built-in facet を継承して残す policy/output/persona は workflow から結線し、未使用なら削除する。
  - 完了時点で discovery/batch validation が old single-step workflow、未結線 facet、独自 loop counter を検出できる。
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - _Boundary:_ DiscoveryBatchWorkflowBundle, DiscoveryBatchValidationHarness
  - _Depends:_ 14, 15
