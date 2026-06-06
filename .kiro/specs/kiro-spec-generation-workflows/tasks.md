# Implementation Plan

- [ ] 1. spec generation workflow validation foundation
- [x] 1.1 spec generation workflow の validation harness を追加する
  - `kiro-spec-*` workflow、facet、output contract、lifecycle terms を検証できる repository-local check を追加する。
  - downstream discovery/batch/implementation workflow が未実装でも failure にしない scope guard を含める。
  - quick workflow が nested `takt` 実行や未確定の `workflow_call` に依存していないことを検証対象に含める。
  - 完了時点で missing workflow/facet、lifecycle drift、quick composition drift が validation finding として確認できる。
  - _Requirements: 5.1, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Boundary:_ SpecGenerationValidationHarness
  - _Depends:_ none

- [ ] 2. shared spec generation contract
- [x] 2.1 spec generation 共通 policy と result contract を追加する
  - phase gate、artifact write、metadata update、blocking result の共通 policy を en/ja facet に追加する。
  - phase completion、updated files、next action、blocking reason を返す output contract を追加する。
  - 完了時点で standalone workflow が同じ result shape と lifecycle rule を参照できる。
  - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.4, 3.5, 4.5, 6.2_
  - _Boundary:_ SpecGenerationWorkflowBundle, SpecArtifactLifecycleAdapter
  - _Depends:_ 1.1

- [ ] 3. spec initialization workflow
- [x] 3.1 `kiro-spec-init` workflow と instruction facet を追加する
  - brief がある場合の description source、brief-only directory reuse、template 読み込み、name conflict handling を実装する。
  - `spec.json` と draft `requirements.md` を initialized state として作成する。
  - 完了時点で brief-only directory から初期 spec が作成され、roadmap や OpenSpec artifact が更新されないことを確認できる。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Boundary:_ SpecInitializationWorkflow
  - _Depends:_ 2.1

- [ ] 4. requirements generation workflow
- [x] 4.1 requirements 生成 policy と `kiro-spec-requirements` workflow を追加する
  - context loading、EARS fixed phrase、numeric IDs、requirements review gate、scope ambiguity blocking を workflow に接続する。
  - requirements 成功時に `phase: "requirements-generated"` と requirements generated state を更新する。
  - 完了時点で requirements.md が EARS と numeric IDs を保持し、曖昧な scope では success state へ進まない。
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Boundary:_ RequirementsGenerationWorkflow
  - _Depends:_ 2.1, 3.1

- [ ] 5. design and research generation workflow
- [x] 5.1 design/research 生成 policy と `kiro-spec-design` workflow を追加する
  - requirements approval gate、`-y` auto-approval、discovery/research、design synthesis、design review gate を workflow に接続する。
  - Boundary Commitments、File Structure Plan、Requirements Traceability を required section として扱う。
  - 完了時点で design.md と research.md が生成され、requirements/design gap がある場合は success state へ進まない。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Boundary:_ DesignGenerationWorkflow
  - _Depends:_ 2.1, 4.1

- [ ] 6. tasks generation workflow
- [x] 6.1 task annotation policy と `kiro-spec-tasks` workflow を追加する
  - requirements/design approval gate、task generation、task plan review、task graph sanity review を workflow に接続する。
  - すべての executable task に observable completion、numeric requirements、Boundary annotation、Depends annotation を要求する。
  - `.kiro/settings/templates/specs/tasks.md` を canonical annotation grammar に更新し、Boundary と Depends が optional のまま残らないようにする。
  - 完了時点で tasks.md が implementation-ready になり、auto-approve mode では ready state が true になる。
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Boundary:_ TasksGenerationWorkflow
  - _Depends:_ 2.1, 5.1

- [ ] 7. quick path sanity review contract
- [x] 7.1 quick path の sanity review contract を追加する
  - requirements/design/tasks の coherence、hidden prerequisite、task annotation を確認する lightweight sanity review output contract を追加する。
  - `PASS`、`NEEDS_FIX`、`BLOCKED` の verdict と修正対象を machine-readable にする。
  - 完了時点で quick workflow が final sanity review の結果を rule condition として参照できる。
  - _Requirements: 5.4, 6.3, 6.4_
  - _Boundary:_ QuickGenerationWorkflow, SpecGenerationValidationHarness
  - _Depends:_ 1.1, 2.1

- [ ] 8. quick phase contract composition
- [x] 8.1 `kiro-spec-quick` workflow を phase contract composition として追加する
  - automatic mode では `quick-init`、`quick-requirements`、`quick-design`、`quick-tasks` を同一 YAML 内で連続実行し、interactive mode では phase 間 approval を要求する。
  - quick phase step は standalone workflow と同じ instruction/policy/output contract を参照し、外部 `workflow_call` や shell 経由の `takt -w` 再起動には依存しない。
  - design/tasks 呼び出し時は standalone workflow と同じ auto-approve semantics を使う。
  - 完了時点で quick path が discovery/batch/implementation を呼ばず、final sanity review 後に completion を返す。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Boundary:_ QuickGenerationWorkflow
  - _Depends:_ 3.1, 4.1, 5.1, 6.1, 7.1

- [ ] 9. language parity
- [x] 9.1 spec generation workflow の en/ja language pair をそろえる
  - 追加した workflow、instruction、policy、output contract の en/ja basename と machine field をそろえる。
  - 日本語 facet は自然な日本語にしつつ、enum、field、path、script 名は shared contract と一致させる。
  - 完了時点で片言語だけの追加や enum drift が validation failure として見える。
  - _Requirements: 6.1, 6.3, 6.4_
  - _Boundary:_ SpecGenerationWorkflowBundle, SpecGenerationValidationHarness
  - _Depends:_ 3.1, 4.1, 5.1, 6.1, 7.1, 8.1

- [ ] 10. lifecycle and artifact fixtures
- [ ] 10.1 lifecycle と artifact contract の fixture 検証を追加する
  - initialized、requirements-generated、design-generated、tasks-generated、auto-approve ready state の fixtures を検証する。
  - required artifact が欠ける場合と phase/approval が矛盾する場合の blocking result を検証する。
  - 完了時点で `spec.json` lifecycle drift と artifact missing が repository-local test で検出できる。
  - _Requirements: 1.4, 2.4, 3.1, 3.5, 4.1, 4.5, 6.2, 6.4_
  - _Boundary:_ SpecArtifactLifecycleAdapter, SpecGenerationValidationHarness
  - _Depends:_ 2.1, 3.1, 4.1, 5.1, 6.1

- [ ] 11. generated artifact validation
- [ ] 11.1 generation artifact の section と task annotation 検証を追加する
  - requirements の EARS/numeric ID、design の boundary/file structure/traceability、tasks の Boundary / Depends annotation を検証する。
  - `.kiro/settings/templates/specs/tasks.md` と `kiro-spec-task-annotations` policy が dependency なしの canonical grammar と全 executable task の Boundary annotation を同じ grammar で要求していることを検証する。
  - `(P)` marker が boundary と dependency graph に反する場合に finding を返す。
  - 完了時点で generated Markdown の欠落や annotation drift が validation failure として見える。
  - _Requirements: 2.2, 3.2, 4.2, 4.3, 4.4, 6.3_
  - _Boundary:_ RequirementsGenerationWorkflow, DesignGenerationWorkflow, TasksGenerationWorkflow, SpecGenerationValidationHarness
  - _Depends:_ 4.1, 5.1, 6.1, 10.1

- [ ] 12. repository-local validation wiring
- [ ] 12.1 validation harness を test command に接続する
  - spec generation validation script を repository の通常 test/check 経路から実行できるようにする。
  - `package.json` に `validate:kiro-spec-generation-workflows` と `test:kiro-spec-generation-workflows` を追加する。
  - workflow/facet parity、lifecycle fixtures、artifact section、task annotation の check をまとめて実行する。
  - 完了時点で spec generation workflow の drift が release 前に通常検証で検出できる。
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Boundary:_ SpecGenerationValidationHarness
  - _Depends:_ 9.1, 10.1, 11.1

- [ ] 13. downstream boundary validation
- [ ] 13.1 下流 spec との境界を最終検証する
  - `kiro-discovery-batch-workflows` が standalone generation workflow または同じ phase contract を呼ぶだけでよいことを確認する。
  - `kiro-iterative-implementation-workflow` が generated `tasks.md` の annotation と ready state を参照できることを確認する。
  - 完了時点で discovery/batch と implementation の責務を本 spec に取り込んでいないことが design と validation scope から確認できる。
  - _Requirements: 1.5, 4.2, 4.5, 5.5, 6.5_
  - _Boundary:_ SpecGenerationWorkflowBundle, QuickGenerationWorkflow, SpecGenerationValidationHarness
  - _Depends:_ 8.1, 12.1

- [ ] 14. built-in facet inheritance audit
- [ ] 14.1 spec generation facets の built-in 継承候補を棚卸しする
  - `node_modules/takt/builtins/{en,ja}/facets` の planning、task-decomposition、output-contract 系 facet を確認し、各 Kiro-specific generation facet の親候補を記録する。
  - 親候補がある facet は shared `BuiltinFacetInheritancePolicy` の `extends` を使い、artifact section、lifecycle update、approval semantics、task annotation だけを差分として記述する。
  - 親候補がない、または full custom が必要な facet は理由を design note または validation finding に残す。
  - 完了時点で spec generation validation harness が親 facet 不在、runtime 未対応、全文コピー前提を検出できる。
  - _Requirements: 6.6_
  - _Boundary:_ SpecGenerationValidationHarness
  - _Depends:_ 3.1, 4.1, 5.1, 6.1, 11.1, 12.1
