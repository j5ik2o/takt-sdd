# Implementation Plan

- [ ] 1. discovery/batch workflow の validation harness を追加する
  - `kiro-discovery`、`kiro-spec-batch`、関連 facet、output contract、roadmap parser fixture を検証できる repository-local check を追加する。
  - downstream `kiro-impl` や individual generation body が未実装でも failure にしない scope guard を含める。
  - 完了時点で missing workflow/facet、action path enum drift、cross-spec output contract drift が validation finding として確認できる。
  - _Requirements: 1.5, 6.1, 6.2, 6.4, 6.5_
  - _Boundary:_ DiscoveryBatchValidationHarness
  - _Depends:_ none

- [ ] 2. discovery routing policy と result contract を追加する
  - existing spec update、direct implementation、single spec、multi-spec、mixed decomposition の action path を policy と output contract に定義する。
  - selected action path、reason、created files、next action、blocking reason を machine-readable にする。
  - 完了時点で discovery が新規 spec generation を開始すべきケースと止めるべきケースを同じ contract から判定できる。
  - _Requirements: 1.1, 1.4, 1.5, 2.5_
  - _Boundary:_ DiscoveryRoutingPolicy, DiscoveryArtifactPlanner
  - _Depends:_ 1

- [ ] 3. `kiro-discovery` workflow と instruction facet を追加する
  - work request、既存 `.kiro/specs/`、roadmap、steering context を読み、routing policy に従って action path を選ぶ。
  - existing/direct path では artifact write なしの next action を返し、single/multi/mixed path では artifact planning に進む。
  - 完了時点で曖昧な request は `BLOCKED` 相当で止まり、推測で roadmap や brief が確定されない。
  - _Requirements: 1.1, 1.4, 2.4_
  - _Boundary:_ DiscoveryWorkflow
  - _Depends:_ 2

- [ ] 4. `brief.md` artifact structure と write path を追加する
  - problem、current state、desired outcome、approach、scope、boundary candidates、out of boundary、upstream/downstream を含む brief structure を定義する。
  - single/multi/mixed の対象 feature directory に `brief.md` を作成する workflow step を接続する。
  - 完了時点で後続 `kiro-spec-init` が brief を source of truth として読める。
  - _Requirements: 1.2, 2.1, 2.4_
  - _Boundary:_ DiscoveryArtifactPlanner
  - _Depends:_ 3

- [ ] 5. roadmap artifact planning と awareness-only section handling を追加する
  - multi-spec と mixed decomposition で `.kiro/steering/roadmap.md` に overview、approach、scope、constraints、boundary strategy、`## Specs (dependency order)` を残す。
  - `Existing Spec Updates` と `Direct Implementation Candidates` を awareness-only として記録し、batch 対象にしない policy を追加する。
  - 完了時点で roadmap から batch 対象 feature と awareness-only item を区別できる。
  - _Requirements: 1.3, 2.2, 2.3, 2.5_
  - _Boundary:_ DiscoveryArtifactPlanner, RoadmapDependencyParser
  - _Depends:_ 4

- [ ] 6. roadmap dependency parser を実装する
  - `## Specs (dependency order)` の checklist entry から feature、description、dependencies、completion status を抽出する。
  - circular dependency、missing dependency、unknown completion marker を blocking result にする。
  - 完了時点で parser fixture から pending/completed specs と dependency error が再現できる。
  - _Requirements: 2.2, 2.3, 3.1, 3.3, 6.2_
  - _Boundary:_ RoadmapDependencyParser
  - _Depends:_ 5

- [ ] 7. batch wave planner を追加する
  - pending specs を、dependencies が完了済みまたは先行 wave に属する feature ごとの dependency wave に分類する。
  - pending feature の `brief.md` existence を wave execution 前に確認する。
  - 完了時点で missing brief と dependency cycle は worker dispatch 前に報告される。
  - _Requirements: 3.2, 3.3, 3.4_
  - _Boundary:_ BatchWavePlanner
  - _Depends:_ 6

- [ ] 8. `kiro-spec-batch` workflow と worker dispatch を追加する
  - roadmap parse、wave plan、same-wave worker dispatch、strict wave ordering、feature result aggregation を workflow に接続する。
  - worker は `kiro-spec-generation-workflows` の init、requirements、design、tasks phase を呼び出し、feature directory に閉じて更新する。
  - 完了時点で同じ wave の success/failure が batch summary に残り、次 wave は前 wave 完了後にだけ開始される。
  - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.3_
  - _Boundary:_ BatchWorkerDispatcher
  - _Depends:_ 7

- [ ] 9. batch summary と remediation coordinator を追加する
  - wave plan、skipped completed specs、worker results、failed features、awareness-only items、next action を summary contract に定義する。
  - generation failure と review issue を区別し、局所修正、再 review、roadmap/discovery return の routing を持たせる。
  - 完了時点で partial success を成功扱いにせず、feature ごとの状態と残作業が利用者に見える。
  - _Requirements: 4.2, 4.4, 5.4, 5.5_
  - _Boundary:_ BatchRemediationCoordinator
  - _Depends:_ 8

- [ ] 10. cross-spec review instruction と output contract を追加する
  - generated specs の requirements、design、tasks、roadmap を読む review instruction を追加する。
  - data model consistency、interface alignment、duplicate functionality、dependency completeness、naming、shared infrastructure ownership、task boundary alignment を issue category にする。
  - 完了時点で review result が severity、affected specs、suggested fix、decomposition return を machine-readable に返す。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_
  - _Boundary:_ CrossSpecReviewWorkflow
  - _Depends:_ 8, 9

- [ ] 11. discovery/batch workflow の en/ja language pair をそろえる
  - 追加した workflow、instruction、policy、output contract の en/ja basename と machine field をそろえる。
  - 日本語 facet は自然な日本語にし、path、script 名、enum、field name は shared contract と一致させる。
  - 完了時点で片言語だけの追加や enum drift が validation failure として見える。
  - _Requirements: 1.5, 6.1, 6.4_
  - _Boundary:_ DiscoveryWorkflow, BatchWorkerDispatcher, CrossSpecReviewWorkflow, DiscoveryBatchValidationHarness
  - _Depends:_ 2, 3, 8, 10

- [ ] 12. repository-local test command に discovery/batch validation を接続する
  - validation script を test runner から実行できる regression test として接続する。
  - roadmap parser fixture、workflow/facet parity、generation workflow reference、cross-spec output contract、scope guard をまとめて検証する。
  - 完了時点で discovery/batch workflow の drift が通常検証で検出できる。
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Boundary:_ DiscoveryBatchValidationHarness
  - _Depends:_ 6, 8, 10, 11

- [ ] 13. discovery/batch facets の built-in 継承候補を棚卸しする
  - `node_modules/takt/builtins/{en,ja}/facets` の research、planning、review 系 facet を確認し、各 Kiro-specific discovery/batch facet の親候補を記録する。
  - 親候補がある facet は shared `BuiltinFacetInheritancePolicy` の `extends` を使い、action path、roadmap dependency wave、cross-spec review だけを差分として記述する。
  - 親候補がない、または full custom が必要な facet は理由を design note または validation finding に残す。
  - 完了時点で discovery/batch validation harness が親 facet 不在、runtime 未対応、全文コピー前提を検出できる。
  - _Requirements: 6.6_
  - _Boundary:_ DiscoveryBatchValidationHarness
  - _Depends:_ 2, 3, 8, 10
