# Implementation Plan

- [ ] 1. implementation workflow の validation harness を追加する
  - `kiro-impl`、`kiro-review`、`kiro-debug`、`kiro-verify-completion` の workflow/facet existence と en/ja parity を検証する repository-local check を追加する。
  - shared review/debug/completion/validation contract reference が欠けた場合に missing reference として検出できるようにする。
  - 完了時点で未作成 workflow/facet と forbidden boundary reference が validation finding として確認できる。
  - _Requirements: 7.1, 7.3, 7.4_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ none

- [ ] 2. implementation progress policy を追加する
  - checkbox 更新前の completion gate、selected task 限定更新、blocker notes、implementation notes、verification evidence の policy facet を en/ja に追加する。
  - progress update 前に `tasks.md` の selected task section を再読し、他 worker の変更を上書きしない規約を明示する。
  - 完了時点で progress update が completion verdict と selected task にだけ紐づくことを facet から確認できる。
  - _Requirements: 4.4, 5.4, 6.2, 6.3_
  - _Boundary:_ KiroTaskProgressUpdater
  - _Depends:_ 1

- [ ] 3. readiness gate と one-task planning の instruction facet を追加する
  - feature readiness、`spec.json`、required artifacts、task annotation、unchecked task、dependency、blocker notes を読む手順を en/ja に追加する。
  - `spec.json.ready_for_implementation` が true でも、status/readiness signal が batch-level readiness 保留を示す場合は code edit 前に `BLOCKED` として止める。
  - eligible な 1 task だけを selected task にし、複数 task batch を作らない decision rule を明示する。
  - 完了時点で ready でない feature、annotation 不足、eligible task 不在が code edit 前に止まる。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_
  - _Boundary:_ KiroImplementationReadinessGate, KiroOneTaskPlanner
  - _Depends:_ 1, 2

- [ ] 4. implementation plan 出力と boundary check を planning facet に接続する
  - selected task の `_Boundary:_`、`_Depends:_`、numeric requirement coverage、関連 design component、変更予定範囲を implementation plan に出す。
  - boundary が design の Boundary Commitments と矛盾する場合の `BLOCK_TASK` decision を明示する。
  - 完了時点で implementation step が task scope、禁止する隣接 scope、validation plan を plan から読める。
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Boundary:_ KiroOneTaskPlanner
  - _Depends:_ 3

- [ ] 5. selected task execution の instruction facet を追加する
  - selected task の boundary 内で code edit、test update、validation command 実行、manual verification requirement 分離を行う手順を en/ja に追加する。
  - validation failure 時に checkbox を更新せず、failure evidence と debug context を返す規約を明示する。
  - 完了時点で implementation result、changed files、command result、missing evidence が実行報告として残る。
  - _Requirements: 3.2, 3.4, 4.1, 4.2, 4.3, 4.4_
  - _Boundary:_ KiroTaskExecutor
  - _Depends:_ 4

- [ ] 6. `kiro-review` internal workflow と review facet を追加する
  - selected task の実装結果を requirement、design boundary、validation evidence に照らして review する `kiro-review` adapter step/facet を en/ja に追加する。
  - `kiro-review` skill の `VERDICT: APPROVED | REJECTED` と actionable findings を workflow rule で参照できるようにする。
  - adapter facet は `extends_skill` と `extends_skill_section` を持ち、Kiro skill 本文をコピーしない。
  - 完了時点で review finding が対象 task と requirement に結びついて返る。
  - _Requirements: 5.1, 5.2, 6.4_
  - _Boundary:_ KiroReviewAdapterStep
  - _Depends:_ 1, 5

- [ ] 7. `kiro-debug` internal workflow と debug facet を追加する
  - validation failure と review finding から root cause、再実行候補としての `RETRY_TASK`、`BLOCK_TASK`、`STOP_FOR_HUMAN` を返す workflow/facet を en/ja に追加する。
  - retry 回数、loop threshold、loop health は debug facet で独自管理せず、`kiro-impl.yaml` の `loop_monitors` に委譲する。
  - `STOP_FOR_HUMAN` では追加実装を継続せず、人間確認事項を blocker として残す規約を明示する。
  - 完了時点で debug decision が machine field と human summary に分離されている。
  - _Requirements: 2.3, 3.3, 5.3, 5.4, 6.4, 7.6_
  - _Boundary:_ KiroDebugAdapterStep
  - _Depends:_ 1, 5, 6

- [ ] 8. `loop_monitors.threshold` を main workflow に接続する
  - `kiro-impl.yaml` に execute/debug と execute/review/debug の cycle を対象にした `loop_monitors.threshold` を定義する。
  - threshold や retry budget は workflow YAML の `loop_monitors.threshold` だけを source of truth とし、facet、frontmatter、validator に独自の回数管理を置かない。
  - threshold 到達時は追加実装ではなく blocker/停止分岐へ進む。
  - 完了時点で独自 loop judge facet や独自 loop-health 管理が存在しない。
  - _Requirements: 5.5, 5.6, 7.6_
  - _Boundary:_ KiroLoopMonitorConfig
  - _Depends:_ 1, 7

- [ ] 9. `kiro-verify-completion` internal workflow と completion facet を追加する
  - implementation result、validation evidence、review verdict、remaining work、manual verification requirement を照合する adapter step/facet を en/ja に追加する。
  - shared `kiro-completion-verification` の `COMPLETE`、`INCOMPLETE`、`BLOCKED` を progress update 前の gate として使う。
  - 完了時点で evidence のない項目が complete 根拠に含まれない。
  - _Requirements: 3.4, 6.1, 6.2, 6.4_
  - _Boundary:_ KiroCompletionVerifier
  - _Depends:_ 1, 5, 6, 7, 8

- [ ] 10. selected task progress update の instruction facet を追加する
  - completion verdict が `COMPLETE` の場合だけ selected task checkbox を `- [x]` に更新する手順を en/ja に追加する。
  - `BLOCK_TASK`、`STOP_FOR_HUMAN`、または `loop_monitors` の非生産的判定では checkbox を更新せず、blocker notes と必要な人間確認事項を selected task に残す。
  - 完了時点で selected task 外の checkbox、blocker、implementation notes を変更しない規約が確認できる。
  - _Requirements: 4.3, 4.4, 5.4, 5.6, 6.2, 6.3_
  - _Boundary:_ KiroTaskProgressUpdater
  - _Depends:_ 2, 7, 8, 9

- [ ] 11. `kiro-impl` main workflow YAML を追加する
  - readiness gate、one-task planning、execution、review、debug、completion verification、progress update を rule condition で接続する。
  - validation failure と `REJECTED` review は debug へ、complete verification は progress update へ、incomplete state は checkbox 更新なしの decision へ分岐する。
  - `loop_monitors` を定義し、`execute-task` / `debug-task` と `execute-task` / `review-task` / `debug-task` の再実行ループを runtime で監視する。
  - workflow/facet/validator 内に独自 retry counter、独自 max-attempt、独自 loop-health source of truth を置かない。
  - 完了時点で `kiro-impl` が 1 iteration で 1 task だけを実装対象にする。
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.3, 5.1, 5.3, 5.5, 5.6, 6.1, 6.2, 6.3_
  - _Boundary:_ KiroImplementationWorkflow
  - _Depends:_ 3, 5, 6, 7, 8, 9, 10

- [ ] 12. workflow gate order、loop monitor、forbidden reference の検証を追加する
  - validation harness に readiness before edit、one-task selection、review/debug before completion、completion before checkbox update の順序検証を追加する。
  - `kiro-impl.yaml` が `loop_monitors.threshold`、debug/review 再実行 cycle、threshold 到達時の停止分岐を持つことを検証する。
  - facet や validator が独自 retry counter、独自 max-attempt、独自 loop-health 判定を source of truth として持つ場合に failure にする。
  - spec generation、batch orchestration、major-version surface、PR monitoring、OpenSpec completion を success condition として参照した場合に failure にする。
  - 完了時点で gate 順序や責務吸収の drift が repository-local test で検出できる。
  - _Requirements: 2.4, 5.5, 5.6, 6.2, 7.1, 7.2, 7.3, 7.4, 7.6_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 11

- [ ] 13. task annotation と progress update の fixture 検証を追加する
  - unchecked task、dependency 未解決 task、blocker 付き task、annotation 不足 task、complete candidate task の fixtures を検証する。
  - selected task 以外を更新しないこと、completion failure では checkbox が変わらないこと、complete の場合だけ implementation notes が残ることを検出する。
  - 完了時点で `tasks.md` の進捗更新ルールが validation failure として再現可能になる。
  - _Requirements: 1.3, 2.1, 2.3, 4.4, 6.2, 6.3, 7.2_
  - _Boundary:_ IterativeImplementationValidationHarness, KiroTaskProgressUpdater
  - _Depends:_ 10, 12

- [ ] 14. implementation workflow の en/ja language pair をそろえる
  - 追加した workflow、instruction、policy の en/ja basename、machine enum、shared contract name をそろえる。
  - 日本語 facet は自然な日本語にしつつ、enum、field、path、script 名は shared contract と一致させる。
  - 完了時点で片言語だけの追加、enum drift、contract name drift が validation failure として見える。
  - _Requirements: 6.4, 7.1_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 11, 12, 13

- [ ] 15. validation harness を test command に接続する
  - implementation workflow validation script を repository の通常 test/check 経路から実行できるようにする。
  - workflow/facet parity、shared contract reference、gate order、loop monitor config、task fixture、forbidden reference check をまとめて実行する。
  - 完了時点で implementation workflow の drift が release 前の通常検証で検出できる。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 14

- [ ] 16. 上流/下流 spec との境界を最終検証する
  - `kiro-status-validation-workflows` の read-only validation、`kiro-spec-generation-workflows` の task annotation、`kiro-shared-workflow-contracts` の review/debug/completion contract だけを参照していることを確認する。
  - discovery/batch、spec generation、major-version surface、PR monitoring の責務を implementation workflow に取り込んでいないことを design と validation scope から確認する。
  - 完了時点で `kiro-impl` が generated `tasks.md` と readiness signal を消費する implementation workflow として閉じている。
  - _Requirements: 1.4, 2.4, 4.4, 7.3, 7.4_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 15

- [ ] 17. implementation facets の built-in 継承候補を棚卸しする
  - `node_modules/takt/builtins/{en,ja}/facets` の coding、testing、review 系 facet を確認し、planning、execution、review/debug/verify facet の親候補を記録する。
  - 親候補がある facet は shared `BuiltinFacetInheritancePolicy` の `extends` を使い、task boundary、checkbox 更新 gate、completion verification だけを差分として記述する。
  - 親候補がない、または full custom が必要な facet は理由を design note または validation finding に残す。
  - 完了時点で implementation validation harness が親 facet 不在、runtime 未対応、全文コピー前提を検出できる。
  - _Requirements: 7.5_
  - _Boundary:_ IterativeImplementationValidationHarness
  - _Depends:_ 11, 14, 15

- [ ] 18. Kiro skill thin adapter へ implementation facets を再整合する
  - `kiro-impl`、`kiro-review`、`kiro-debug`、`kiro-verify-completion`、`kiro-validate-impl` の instruction facet に `extends_skill` と `extends_skill_section` を持たせる。
  - Kiro skill 本文をコピーせず、input artifacts、output fields、rule condition、artifact write boundary だけを差分として記述する。
  - `kiro-review` / `kiro-debug` / `kiro-verify-completion` / `kiro-validate-impl` は別 workflow を起動せず、`kiro-impl.yaml` 内の adapter step として接続する。
  - en/ja adapter facet の skill section、machine field、enum が一致することを validation に追加する。
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 17

- [ ] 19. Kiro skill field contract に implementation rule を合わせる
  - implementer `STATUS: READY_FOR_REVIEW | BLOCKED | NEEDS_CONTEXT`、reviewer `VERDICT: APPROVED | REJECTED`、debugger `NEXT_ACTION: RETRY_TASK | BLOCK_TASK | STOP_FOR_HUMAN` を primary machine field として workflow rule に接続する。
  - final feature validation は `kiro-validate-impl` の `DECISION: GO | NO-GO | MANUAL_VERIFY_REQUIRED` を primary machine field として扱う。
  - shared review/debug/completion contract を使う場合も Kiro skill field を独自 `validation.verdict` や `review.verdict` へ翻訳しない。
  - _Requirements: 5.1, 5.3, 6.4, 6.5, 8.2, 8.3_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 18

- [ ] 20. unreleased implementation workflow/facet を削除または再作成する
  - `.takt/{en,ja}/workflows/kiro-review.yaml`、`kiro-debug.yaml`、`kiro-verify-completion.yaml` のような独立 internal workflow が残る場合は削除し、`kiro-impl.yaml` 内の adapter step へ移す。
  - `.takt/{en,ja}/facets/instructions/kiro-impl-debug-loop-judge.md` のような独自 loop-health facet が残る場合は削除し、`loop_monitors.threshold` に一本化する。
  - workflow から参照されない Kiro-specific facet を validation failure にする。
  - _Requirements: 7.6, 8.3, 8.5_
  - _Boundary:_ KiroImplementationWorkflow, IterativeImplementationValidationHarness
  - _Depends:_ 18, 19
