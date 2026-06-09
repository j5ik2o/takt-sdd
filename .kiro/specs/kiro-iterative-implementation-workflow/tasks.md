# Implementation Plan

## Validation contract notes

- `kiro-implementation-result`
- `STATUS: READY_FOR_REVIEW | BLOCKED | NEEDS_CONTEXT`
- Kiro review/debug/verify は standalone workflow ではなく `kiro-impl` 内の adapter step として接続する。

- [x] 1. 検証ハーネスの期待構造を並行 reviewer 前提に更新する
- [x] 1.1 `kiro-impl` の gate order と reviewer group 構造を検出する検証を追加する
  - `ai-quality-gate` が `reviewers` より前にあり、`reviewers` が `verify-task-completion` より前にあることを検証できる。
  - `reviewers.parallel` が存在し、coding、architecture、QA、testing の child reviewer が必須であることを検出できる。
  - `security-reviewer` または `requirements-reviewer` が mandatory child step として入った場合に validation failure になる。
  - 現在の repository validation で reviewer group の不足や順序 drift が actionable failure として見える。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.8_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ none

- [x] 1.2 reviewer report と routing vocabulary の検証を追加する
  - child reviewer の `approved` / `needs_fix` 条件と group-level `all("approved")` / `any("needs_fix")` routing を検証できる。
  - coding、architecture、QA、testing の report が互いに区別できる filename と contract を持つことを検出できる。
  - completion verifier と debug adapter が AI gate report と reviewer reports を evidence として読むことを validation failure で再現できる。
  - 現在の repository validation で missing report、wrong routing、evidence omission が検出できる。
  - _Requirements: 5.2, 6.1, 6.4, 7.1, 7.2, 9.6, 9.7, 9.9_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 1.1

- [x] 2. `kiro-impl` workflow routing を AI gate と parallel reviewers に接続する
- [x] 2.1 AI quality gate から reviewer group への routing を更新する
  - `execute-task` の successful candidate が通常 review へ直行せず、先に AI quality gate を通る。
  - AI quality gate の `COMPLETE` が `reviewers` へ進み、`need_replan` が `debug-task`、`ABORT` が `ABORT` へ進む。
  - workflow 上で readiness、one-task execution、AI gate、reviewers、completion verification の順序が読める。
  - validation fixture で AI gate bypass が失敗として検出できる。
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2, 5.1, 5.2, 7.2, 8.2, 8.3_
  - _Boundary:_ KiroImplementationWorkflow, KiroAIQualityGateCall
  - _Depends:_ 1.1

- [x] 2.2 `reviewers.parallel` group を workflow に追加する
  - `reviewers` step が `parallel:` child steps として `coding-review`、`arch-review`、`qa-review`、`testing-review` を持つ。
  - 各 child reviewer は read-only で selected task、implementation evidence、AI gate reports、requirements/design/tasks refs を読む。
  - `all("approved")` は `verify-task-completion` へ進み、`any("needs_fix")` は `debug-task` へ進む。
  - workflow 実行計画上、同じ完了候補に対して 4 観点が並行 review されることが確認できる。
  - _Requirements: 5.3, 6.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_
  - _Boundary:_ KiroImplementationWorkflow, KiroParallelReviewersGroup
  - _Depends:_ 1.2, 2.1

- [x] 2.3 loop monitor cycle を reviewers group に合わせて更新する
  - `execute-task -> debug-task` cycle と `execute-task -> ai-quality-gate -> reviewers -> debug-task` cycle が `loop_monitors.threshold` で表現される。
  - 独自 retry counter、独自 max-attempt、独自 loop-health source of truth が workflow/facet/validator に残らない。
  - loop exhaustion は追加実装へ戻らず blocker note または human stop へ進む。
  - validation fixture で reviewers を含まない loop monitor が failure になる。
  - _Requirements: 5.5, 5.6, 7.6_
  - _Boundary:_ KiroLoopMonitorConfig
  - _Depends:_ 2.2

- [x] 3. reviewer adapter facets を Kiro selected task context に合わせる
- [x] 3.1 coding review adapter を reviewers child step として再整合する
  - coding review が selected task boundary、actual diff、validation evidence、AI gate reports を読んで verdict を返す。
  - report が coding review の evidence として識別でき、human summary と machine verdict が分離される。
  - existing `kiro-review` skill mapping は維持し、Kiro skill 本文のコピーを増やさない。
  - completion verifier と debug adapter が coding review report を参照できる。
  - _Requirements: 6.4, 8.1, 8.2, 8.4, 9.2, 9.9_
  - _Boundary:_ KiroParallelReviewersGroup
  - _Depends:_ 2.2

- [x] 3.2 architecture review adapter を追加する
  - architecture review が design boundary、dependency direction、cross-task responsibility drift を確認する。
  - built-in architecture reviewer asset を Kiro selected task context に接続し、Kiro-specific 差分だけを記述する。
  - architecture review report が `needs_fix` の場合、対象観点と finding source が debug input として残る。
  - validation で missing architecture reviewer child step が failure になる。
  - _Requirements: 7.5, 9.1, 9.3, 9.7, 9.9_
  - _Boundary:_ KiroParallelReviewersGroup
  - _Depends:_ 2.2

- [x] 3.3 QA review adapter を追加する
  - QA review が requirements coverage、acceptance criteria、operator-visible behavior の抜け漏れを確認する。
  - built-in QA reviewer asset を Kiro selected task context に接続し、Kiro-specific 差分だけを記述する。
  - QA review report が `needs_fix` の場合、関連 requirement refs と actionable findings が debug input として残る。
  - validation で missing QA reviewer child step が failure になる。
  - _Requirements: 7.5, 9.1, 9.4, 9.7, 9.9_
  - _Boundary:_ KiroParallelReviewersGroup
  - _Depends:_ 2.2

- [x] 3.4 testing review adapter を追加する
  - testing review が test evidence、regression coverage、manual verification gap を確認する。
  - built-in testing reviewer asset を Kiro selected task context に接続し、Kiro-specific 差分だけを記述する。
  - testing review report が `needs_fix` の場合、missing test evidence と manual verification gap が debug input として残る。
  - validation で missing testing reviewer child step が failure になる。
  - _Requirements: 3.4, 7.5, 9.1, 9.5, 9.7, 9.9_
  - _Boundary:_ KiroParallelReviewersGroup
  - _Depends:_ 2.2

- [x] 4. debug と completion verification を複数 reviewer evidence に対応させる
- [x] 4.1 debug adapter が rejected child reports を読むように更新する
  - validation failure、AI gate `need_replan`、reviewers `any("needs_fix")` の各 failure context を root cause 判定に使える。
  - debug decision は `NEXT_ACTION: RETRY_TASK | BLOCK_TASK | STOP_FOR_HUMAN` と `retry_eligible` を primary machine fields として返す。
  - `STOP_FOR_HUMAN` では追加実装へ戻らず、人間確認事項が selected task blocker として残る。
  - rejected reviewer の観点、report file、finding refs、task/requirement/design refs が debug report で確認できる。
  - _Requirements: 2.4, 3.3, 5.2, 5.3, 5.4, 6.4, 9.7_
  - _Boundary:_ KiroDebugAdapterStep
  - _Depends:_ 3.1, 3.2, 3.3, 3.4

- [x] 4.2 completion verifier が AI gate と 4 reviewer reports を必須 evidence として扱う
  - implementation result、validation evidence、AI gate report、coding/architecture/QA/testing reports が揃った場合だけ `VERIFIED` 候補になる。
  - missing、stale、cross-run、manual verification gap は `NOT_VERIFIED` または `MANUAL_VERIFY_REQUIRED` として扱われる。
  - checkbox update 前に incomplete evidence が blocker/debug path へ戻る。
  - completion report から required evidence の有無と missing evidence が確認できる。
  - _Requirements: 3.4, 6.1, 6.2, 6.4, 9.6, 9.9_
  - _Boundary:_ KiroCompletionVerifier
  - _Depends:_ 3.1, 3.2, 3.3, 3.4

- [x] 4.3 progress update と final validation の既存境界を再確認する
  - `VERIFIED` の場合だけ selected task checkbox と implementation notes が更新される。
  - validation failure、AI gate failure、reviewer needs-fix、completion incomplete では selected task 外の checkbox が更新されない。
  - all tasks complete の場合だけ final validation `DECISION: GO | NO-GO | MANUAL_VERIFY_REQUIRED` が実行される。
  - progress update fixture で selected task 外の変更が failure として検出できる。
  - _Requirements: 4.3, 4.4, 5.4, 5.6, 6.2, 6.3, 6.5_
  - _Boundary:_ KiroTaskProgressUpdater, KiroFinalImplValidator
  - _Depends:_ 4.1, 4.2

- [x] 5. readiness、planning、execution の既存 contract を regressions から守る
- [x] 5.1 readiness と one-task planning の regression fixtures を更新する
  - `ready_for_implementation` false、missing artifact、missing `_Boundary:_`、missing `_Depends:_` が code edit 前に止まる。
  - `_Depends:_ none` は empty dependency set として扱われ、複数 eligible tasks では先頭の 1 task だけが selected task になる。
  - dependency 未解決または blocker 付き task だけの場合、`BLOCK_TASK` または `STOP_FOR_HUMAN` 相当の decision が返る。
  - validation fixture で readiness / planning drift が failure として再現できる。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Boundary:_ KiroImplementationReadinessGate, KiroOneTaskPlanner, IterativeImplementationValidationHarness
  - _Depends:_ 1.1

- [x] 5.2 execution result contract の regression fixtures を更新する
  - selected task boundary 内の code edit と validation evidence collection が `STATUS READY_FOR_REVIEW` の前提として表現される。
  - `STATUS BLOCKED` と `STATUS NEEDS_CONTEXT` は reviewers へ進まず debug path へ進む。
  - validation command failure では checkbox update が発生しない。
  - execution report から changed files、command results、missing evidence、manual verification requirement が確認できる。
  - _Requirements: 3.2, 3.4, 4.1, 4.2, 4.3, 6.4, 8.2_
  - _Boundary:_ KiroTaskExecutor, IterativeImplementationValidationHarness
  - _Depends:_ 5.1

- [x] 6. en/ja language pair と package validation surface をそろえる
- [x] 6.1 en/ja workflow と facet basename parity を更新する
  - 追加・変更した workflow、instruction、policy、output contract の basename が en/ja でそろう。
  - enum、machine fields、report names、script names は翻訳せず両言語で一致する。
  - Kiro-specific facets は Kiro skill / built-in facet の差分だけを記述し、上流 skill 本文をコピーしない。
  - validation で片言語だけの追加や enum drift が failure になる。
  - _Requirements: 6.4, 7.1, 7.5, 8.1, 8.4_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 2.2, 3.1, 3.2, 3.3, 3.4

- [x] 6.2 package script と通常検証経路を最新 validator に接続する
  - `validate:kiro-iterative-implementation-workflow` と `test:kiro-iterative-implementation-workflow` が最新の reviewer group validation を実行する。
  - public `kiro:*` command surface は変更されない。
  - repository-local check で workflow/facet/contract drift、boundary violation、language pair drift がまとめて検出できる。
  - package script mismatch fixture が validation failure として残る。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.3, 8.5_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 6.1

- [x] 7. 統合検証と deterministic smoke を追加する
- [x] 7.1 reviewer group の integration validation を追加する
  - fixture workflow で `all("approved")` 欠落、`any("needs_fix")` 欠落、wrong report name、mandatory security reviewer 混入が failure になる。
  - completion verifier が reviewer evidence を無視する fixture と debug adapter が child reports を読まない fixture が failure になる。
  - current repository が `validate:kiro-iterative-implementation-workflow` と `test:kiro-iterative-implementation-workflow` を通過する。
  - validation output が missing step / wrong routing / boundary violation を actionable に示す。
  - _Requirements: 5.1, 5.2, 6.1, 7.1, 7.2, 7.3, 7.4, 7.6, 9.6, 9.7, 9.8, 9.9_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 2.3, 4.1, 4.2, 6.2

- [x] 7.2 deterministic wiring smoke を opt-in で追加する
  - mock provider output で `execute-task -> ai-quality-gate -> reviewers -> verify-task-completion` の routing を確認できる。
  - smoke は provider review quality を評価せず、step/report path と deterministic wiring だけを確認する。
  - default CI や default validation で live provider を呼ばない opt-in 実行になっている。
  - smoke artifact から reviewers group と completion path が期待どおり通ったことを確認できる。
  - _Requirements: 4.2, 5.1, 6.1, 7.2, 9.1, 9.6_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 7.1

- [x] 7.3 Kiro implementation workflow の最終境界検証を実行する
  - implementation workflow が spec generation、roadmap batch orchestration、major-version surface、PR monitoring、OpenSpec completion を成功条件に含めないことを確認する。
  - `.agents/skills/kiro-*` 上流 skill 資産を直接修正していないことを確認する。
  - generated `tasks.md` と readiness signal を消費する implementation workflow として閉じていることを確認する。
  - final validation で all requirements coverage と design component coverage が確認できる。
  - _Requirements: 1.4, 2.5, 4.4, 7.3, 7.4, 8.4, 8.5_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 7.2
