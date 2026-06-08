# Implementation Plan

- [ ] 1. Coverage foundation と shared gate contract を固定する
- [x] 1.1 Kiro workflow coverage inventory の正本と人間向け判断基準を定義する
  - すべての Kiro workflow が exactly one category を持ち、対象外 workflow には operator が読める理由がある状態にする。
  - `kiro-impl`、spec generation、quick、init、discovery、batch、status/validate の分類が design の category と一致していることを確認できる。
  - workflow ごとの分類は machine-readable helper を正本にし、policy facet は分類表を再掲せず category semantics と判断基準だけを説明する。
  - roadmap checkbox marker を implementation progress 判定に使わない分類根拠を明示する。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 6.3, 6.4, 6.5, 8.3_
  - _Boundary:_ CoverageInventoryContract
  - _Depends:_ none

- [x] 1.2 PR #90 の 6 点契約と allowed gate call sites を共有契約として定義する
  - implementation gate と generation gate の allowed call site が workflow name、step name、relative call path で表現される状態にする。
  - bare workflow name call、未分類 caller、read-only caller を拒否するための contract terms が揃っている状態にする。
  - routing vocabulary、catch-all routing、optional fix report、loop exhaustion、caller loop monitor membership の検証語彙が 1 箇所から参照できる。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.3_
  - _Boundary:_ SharedGateContractHelper
  - _Depends:_ 1.1

- [ ] 2. Generation-scoped AI quality gate と facet 契約を作る
- [x] 2.1 spec generation draft 用の callable AI quality gate を追加する
  - requirements/design/tasks draft を first-pass AI antipattern review に通し、blocking issue がない場合は fix report なしで完了できる。
  - fixable issue は current artifact boundary の repair route に戻り、upstream phase 変更や roadmap 再分解が必要な issue は replan/upstream-repair outcome へ分岐する。
  - ambiguous、blocked、inconsistent outcome が未一致で落ちない catch-all route を持つ。
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary:_ SpecAiQualityGateWorkflow
  - _Depends:_ 1.2

- [x] 2.2 generation artifact boundary 用の fix instruction と output contract を追加する
  - spec artifact boundary 内で直せる内容と、upstream/boundary 外へ返すべき内容が prompt 上で区別される。
  - generation fix report の machine fields、report names、optional semantics が en/ja で一致している。
  - implementation progress 用の fix report semantics と混ざらないことが確認できる。
  - _Requirements: 3.4, 4.4, 4.5, 5.2, 5.3, 8.2, 8.4_
  - _Boundary:_ SpecAiQualityGateWorkflow, GateEvidenceAdapters
  - _Depends:_ 2.1

- [x] 2.3 downstream review/finalize が gate evidence を消費するように facet 指示を更新する
  - unresolved AI antipattern findings がある draft は domain review/finalize で accept されない。
  - optional fix report が存在する場合、blocked、stale、cross-run、evidence-free no-fix が reject される。
  - first-pass no blocking で fix report がない場合は failure にならない。
  - rejection は既存 repair、replan、blocked route に戻ることが prompt 上で明示される。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.4_
  - _Boundary:_ GateEvidenceAdapters
  - _Depends:_ 2.1, 2.2

- [ ] 3. Eligible generation workflows に gate を接続する
- [x] 3.1 standalone spec generation workflows に gate route と loop monitor を追加する
  - requirements、design、tasks の generate/repair 直後に matching gate step が入り、その後に既存 domain review へ進む。
  - 各 loop monitor cycle に matching gate step が含まれ、finalize から repair へ戻る既存循環も壊れない。
  - finalize は raw gate report を再評価せず、verified review/finalize result に依存して lifecycle promotion する。
  - _Requirements: 3.1, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.5, 8.1_
  - _Boundary:_ GenerationWorkflowIntegration
  - _Depends:_ 2.1, 2.3

- [x] 3.2 quick workflow に phase-local gate route と loop monitor を追加する
  - quick requirements/design/tasks の各 phase で generate/repair 直後に matching quick gate step が入り、既存 quick review step へ進む。
  - quick の allowed `workflow_call` は spec AI quality gate だけで、standalone phase workflow reuse は引き続き起きない。
  - quick の各 phase loop monitor に matching quick gate step が含まれている。
  - _Requirements: 3.1, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1_
  - _Boundary:_ GenerationWorkflowIntegration
  - _Depends:_ 2.1, 2.3

- [x] 3.3 read-only と orchestration の対象外境界を workflow 上で保つ
  - status/validate workflow に edit-capable gate/fix step、repair/debug step、loop monitor、nested Kiro workflow call が追加されていない。
  - discovery と batch は artifact-level AI review owner を downstream generation workflows として分類し、直接 fix loop を持たない。
  - 新規の未判断 orchestration workflow は covered ではなく maintainer decision required として扱える。
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4_
  - _Boundary:_ GenerationWorkflowIntegration, ReadOnlyGuardValidator
  - _Depends:_ 1.1, 3.1, 3.2

- [ ] 4. Validator と unit tests で drift を検出する
- [ ] 4.1 coverage validator を追加して未分類・eligible bypass・不正 gate を検出する
  - 全 Kiro workflow の分類過不足、eligible generation workflow の gate bypass、判定不能 workflow が actionable finding として fail する。
  - read-only workflow に gate/fix behavior が入った場合、対象 workflow と violation reason が表示される。
  - en/ja の workflow structure、call paths、report names、machine routing terms の drift が covered 扱い前に fail する。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.5, 8.1, 8.2, 8.5_
  - _Boundary:_ CoverageValidator, ReadOnlyGuardValidator
  - _Depends:_ 1.1, 1.2, 3.3

- [ ] 4.2 existing Kiro validators を shared contract と generation gate placement に合わせて更新する
  - shared workflow call validator が helper の allowlist を使い、relative gate call 以外の nested Kiro workflow reuse を拒否する。
  - spec generation validator が standalone/quick の gate placement と quick の限定的 `workflow_call` 許可を検証する。
  - status/validation validator が coverage helper の read-only list と同期して gate/fix loop 混入を拒否する。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 7.2, 7.3_
  - _Boundary:_ SharedGateContractHelper, CoverageValidator, ReadOnlyGuardValidator
  - _Depends:_ 4.1

- [ ] 4.3 validator unit tests と parity tests を追加する
  - positive fixture では implementation gate と generation gate の approved call sites が pass する。
  - negative fixture では bare workflow name call、quick phase workflow reuse、missing gate、read-only fix loop、language drift が fail する。
  - policy facet が workflow 別分類表を再掲せず、machine-readable coverage inventory を正本として参照していることを検出できる。
  - _Requirements: 1.4, 2.4, 2.5, 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.5_
  - _Boundary:_ CoverageValidator, RuntimeSmokeFixture
  - _Depends:_ 4.2

- [ ] 5. Runtime smoke と repository integration を完了する
- [ ] 5.1 generation-scoped gate の deterministic successful path smoke を追加する
  - mock provider fixture で spec generation workflow が spec AI gate を通り、no blocking finding の場合に fix report なしで domain review へ進む。
  - smoke は artifact 品質評価ではなく workflow wiring の検証に限定され、成功時に gate step と後続 review step の到達が観測できる。
  - runtime smoke が失敗した場合、どの route または report semantics が壊れたかを出力から追える。
  - _Requirements: 3.4, 4.1, 5.3, 7.4_
  - _Boundary:_ RuntimeSmokeFixture
  - _Depends:_ 3.1, 4.2

- [ ] 5.2 npm scripts と CI から新しい validator/test/smoke を実行できるようにする
  - 新しい validator、unit test、runtime smoke が既存の script naming pattern で実行できる。
  - CI が Kiro validator/test を個別列挙している場合、新しい checks が同じ段に含まれている。
  - repository validation を実行すると coverage、shared contract、spec generation、status validation、runtime smoke の対象がすべて検証される。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.5_
  - _Boundary:_ RuntimeSmokeFixture, CoverageValidator
  - _Depends:_ 4.3, 5.1
