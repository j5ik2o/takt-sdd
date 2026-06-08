# Implementation Plan

- [x] 1. Coverage inventory と shared gate contract を discovery 対応へ更新する
- [x] 1.1 Coverage inventory に discovery gate category と callable gate 分類を追加する
  - `kiro-discovery` が `discovery_artifact_gate_required` として分類され、`kiro-discovery-ai-quality-gate` が callable gate 自体として `existing_gate_coverage` に分類される。
  - `kiro-spec-batch` は `orchestration_delegated` のまま、adjacent owner が worker generation workflows として記録される。
  - すべての `.takt/{en,ja}/workflows/kiro-*` が exactly once で分類され、未分類 workflow は maintainer decision finding になる。
  - roadmap checkbox marker を implementation progress 判定に使わない分類根拠が維持される。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.5, 6.6, 6.7, 8.3_
  - _Boundary:_ CoverageInventoryContract
  - _Depends:_ none

- [x] 1.2 Shared gate contract に discovery call site と report terms を追加する
  - allowed gate call site に `kiro-discovery` / `ai-quality-gate-discovery` / `./kiro-discovery-ai-quality-gate.yaml` / `discovery_artifact` が追加される。
  - implementation、spec generation、discovery の report names と optional fix report names が gate kind ごとに区別される。
  - relative `workflow_call`、built-in routing vocabulary、catch-all routing、optional fix report、loop outcome、caller loop monitor membership の検証語彙が 1 箇所から参照できる。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.3, 8.2_
  - _Boundary:_ SharedGateContractHelper
  - _Depends:_ 1.1

- [x] 2. Discovery-scoped AI quality gate を作る
- [x] 2.1 discovery artifact 用 callable AI quality gate workflow を追加する
  - `kiro-discovery-ai-quality-gate` が callable internal subworkflow として en/ja に存在し、first-pass AI antipattern review を最初に実行する。
  - blocking issue がない場合は fix report なしで `COMPLETE` でき、ambiguous / blocked / internally inconsistent outcome は replan path に流れる。
  - fixable issue は discovery-scoped fix step に進み、loop exhaustion は `need_replan` を返す。
  - report names は `kiro-discovery-ai-antipattern-review.md` と `kiro-discovery-ai-antipattern-fix.md` で、implementation/spec generation report names と混ざらない。
  - _Requirements: 2.7, 3.2, 3.3, 3.4, 3.5, 3.7, 6.2, 6.3, 6.4, 7.7, 8.1, 8.2_
  - _Boundary:_ DiscoveryAiQualityGateWorkflow
  - _Depends:_ 1.2

- [x] 2.2 discovery artifact boundary 用の fix instruction と output contract を追加する
  - discovery fix instruction が `brief.md` と `.kiro/steering/roadmap.md` の current discovery artifact boundary 内だけを修正対象にする。
  - requirements/design/tasks artifact、既存 spec ownership、implementation files への越境修正は `NEED_REPLAN` または `BLOCKED` として扱われる。
  - discovery fix report の machine fields、status values、changed files、scope guard、validation evidence が en/ja で一致する。
  - first-pass clean の場合に optional fix report 不在が failure にならない semantics が明示される。
  - _Requirements: 2.7, 3.4, 4.5, 5.2, 5.3, 6.3, 6.4, 7.7, 8.2, 8.4_
  - _Boundary:_ DiscoveryAiQualityGateWorkflow, GateEvidenceAdapters
  - _Depends:_ 2.1

- [x] 3. `kiro-discovery` workflow と discovery report evidence を接続する
- [x] 3.1 `kiro-discovery` の artifact write success path に discovery gate を挿入する
  - `SINGLE_SPEC`、`MULTI_SPEC`、`MIXED_DECOMPOSITION` の successful write path が `report-discovery` へ直行せず `ai-quality-gate-discovery` へ進む。
  - `EXISTING_SPEC_UPDATE` と `DIRECT_IMPLEMENTATION` の artifact-less path は discovery gate を bypass して `report-discovery` へ進む。
  - `ai-quality-gate-discovery` は relative path の `workflow_call` を使い、`COMPLETE` は `report-discovery`、`need_replan` は `plan-discovery-artifacts`、`ABORT` は `ABORT` に進む。
  - en/ja の workflow structure、step name、call path、routing terms が一致する。
  - _Requirements: 2.6, 3.1, 3.6, 5.6, 6.2, 6.3, 6.4, 7.6, 8.1_
  - _Boundary:_ DiscoveryWorkflowIntegration
  - _Depends:_ 2.1, 2.2

- [x] 3.2 `kiro-discovery` caller loop monitor で replan cycle を収束管理する
  - `plan-discovery-artifacts`、`write-discovery-artifacts`、`ai-quality-gate-discovery` を含む caller loop monitor が en/ja workflow に追加される。
  - repeated non-convergence が threshold に到達した場合、追加修正を試みず blocked discovery reporting へ進む。
  - loop monitor が artifact-less path や read-only validation workflows に影響しない。
  - validator と tests から cycle membership と threshold outcome が観測できる。
  - _Requirements: 3.5, 3.6, 3.7, 6.4, 7.3, 7.6, 8.1_
  - _Boundary:_ DiscoveryWorkflowIntegration
  - _Depends:_ 3.1

- [x] 3.3 discovery report facet が scoped gate evidence を消費するように更新する
  - `report-discovery` の指示が namespaced `kiro-discovery-ai-antipattern-review.md` と optional fix report を確認する。
  - unresolved findings、stale/cross-run/evidence-free no-fix、implementation/spec generation report name の誤用は completion として扱われない。
  - first-pass no blocking で fix report がない場合は failure にならない。
  - gate evidence rejection は existing discovery repair/replan/blocked path と整合する。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 8.2, 8.4_
  - _Boundary:_ GateEvidenceAdapters
  - _Depends:_ 3.1

- [x] 4. Validators と unit tests を discovery gate 対応へ更新する
- [x] 4.1 coverage validator が discovery gate required と forbidden wiring を検出する
  - `kiro-discovery` に discovery gate call がない場合、actionable failure になる。
  - `kiro-discovery` に implementation-scoped fix instruction、spec generation report names、または unapproved gate call が配線された場合、具体的な failure になる。
  - `kiro-discovery-ai-quality-gate` が inventory にない場合、全 workflow exactly once の failure になる。
  - read-only workflows と `kiro-spec-batch` に direct AI fix loop が入った場合、対象 workflow と violation reason が出力される。
  - _Requirements: 1.1, 1.2, 1.4, 2.2, 2.4, 2.5, 7.1, 7.2, 7.5, 7.6, 7.7, 8.1, 8.2, 8.5_
  - _Boundary:_ CoverageValidator, ReadOnlyGuardValidator
  - _Depends:_ 1.1, 1.2, 3.1, 3.2

- [x] 4.2 discovery/batch と shared validators を allowlist 型の `workflow_call` 検証へ更新する
  - discovery/batch validator は `kiro-discovery` の approved discovery gate call だけを許可し、phase reuse、shell `takt -w`、`kiro-spec-batch` direct gate を引き続き拒否する。
  - shared workflow call validator は helper の allowed call sites を正本にし、bare workflow name と unapproved nested Kiro workflow reuse を拒否する。
  - existing spec generation gate checks は維持され、quick の approved spec gate call だけが許可される。
  - en/ja parity drift が covered 扱い前に failure になる。
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 6.1, 6.5, 6.6, 7.2, 7.3, 8.1, 8.5_
  - _Boundary:_ SharedGateContractHelper, CoverageValidator, ReadOnlyGuardValidator
  - _Depends:_ 4.1

- [x] 4.3 validator unit tests と parity tests を discovery gate expectations に更新する
  - positive tests で `kiro-discovery-ai-quality-gate` の `existing_gate_coverage`、`kiro-discovery` の `discovery_artifact_gate_required`、`kiro-spec-batch` の delegated owner が確認される。
  - negative fixtures で missing discovery gate、wrong fix instruction、wrong report name、unapproved workflow call、read-only fix loop、batch direct gate が fail する。
  - policy facet が workflow-by-workflow table を複製せず、machine-readable inventory を正本として参照していることが確認される。
  - 既存 generation-scoped gate の positive/negative tests は、current artifact boundary repair path を含む regression として維持される。
  - _Requirements: 1.1, 1.3, 1.4, 2.5, 4.1, 4.2, 4.3, 4.4, 5.5, 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.1, 8.2, 8.5_
  - _Boundary:_ CoverageValidator, RuntimeSmokeFixture
  - _Depends:_ 4.2

- [x] 5. Runtime smoke と repository integration を完了する
- [x] 5.1 discovery gate の deterministic successful path smoke を追加する
  - mock provider fixture で `kiro-discovery` が discovery artifacts を書いた後、discovery gate clean path を通って `report-discovery` に到達する。
  - smoke は artifact 品質評価ではなく workflow wiring の検証に限定され、gate step と report step の到達が観測できる。
  - fix report 不在の clean path が failure にならないことが確認される。
  - 通常実行が Codex provider に切り替わらない opt-in mock path で実行できる。
  - _Requirements: 3.4, 5.3, 5.6, 6.2, 7.4_
  - _Boundary:_ RuntimeSmokeFixture
  - _Depends:_ 3.1, 3.3, 4.2

- [x] 5.2 repository scripts と CI 対象に discovery gate coverage checks を接続する
  - 新しいまたは更新された validator、unit test、runtime smoke が既存 npm script naming pattern で実行できる。
  - CI が Kiro validator/test を個別列挙している場合、discovery gate checks が同じ段に含まれる。
  - repository validation を実行すると coverage、shared contract、discovery/batch、spec generation、status/read-only、runtime smoke の対象がすべて検証される。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.5_
  - _Boundary:_ RuntimeSmokeFixture, CoverageValidator
  - _Depends:_ 4.3, 5.1
