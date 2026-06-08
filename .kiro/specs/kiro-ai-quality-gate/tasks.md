# Implementation Plan

- [x] 1. Project-local TAKT policy を記録する
- [x] 1.1 TAKT 開発規約を project root に記録する
  - 上流 `.agents/skills/kiro-*` は直接修正しない方針を記録する。
  - TAKT workflow/facet prompts が上流 skill の曖昧さを高い prompt 優先度で補う方針を記録する。
  - `.kiro/settings/**` は project-local settings として変更可能であることを記録する。
  - 完了時点で root `TAKT.md` を読めば、上流 skill 資産と TAKT 資産の責任境界が分かる。
  - _Requirements: 8.4_
  - _Boundary:_ TAKT Project Policy
  - _Depends:_ none

- [x] 2. AI quality gate の独立資産を作る
- [x] 2.1 (P) AI antipattern fix result contract を定義する
  - `FIXED`、`NO_FIX_NEEDED`、`NEED_REPLAN`、`BLOCKED` の machine status を定義する。
  - finding ごとの decision、changed files、scope guard、validation evidence、missing context を必須の判断材料として示す。
  - `NO_FIX_NEEDED` が summary-only にならず、証跡付き rationale を要求する。
  - 完了時点で `.takt/en` と `.takt/ja` の output contract が同じ machine fields を持つ。
  - _Requirements: 5.2, 6.1, 6.2, 6.3, 6.4_
  - _Boundary:_ Fix Result Contract
  - _Depends:_ none

- [x] 2.2 (P) implementation-scope fix instruction を定義する
  - selected task、`changed_files`、requirements/design/tasks を修正スコープの根拠として扱う。
  - `tasks.md` checkbox と Implementation Notes を更新しない制約を明記する。
  - boundary 変更、progress 更新、必要情報欠落を `NEED_REPLAN` または `BLOCKED` として扱う。
  - 完了時点で fix step が読める instruction から、許可された修正範囲と禁止された progress update が判別できる。
  - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 6.4_
  - _Boundary:_ AI Fix Step
  - _Depends:_ none

- [x] 2.3 Callable AI quality gate workflow を定義する
  - `subworkflow.callable: true`、`returns`、`facet_ref` / `facet_ref[]` params だけで gate contract を表現する。
  - built-in AI antipattern review 資産を使い、review report を `kiro-ai-antipattern-review.md` として出力する。
  - fix step は `kiro-ai-antipattern-fix.md` を出力し、bounded review/fix loop threshold を 3 にする。
  - `COMPLETE`、`need_replan`、`ABORT` のみを caller に返す。
  - 完了時点で `.takt/en` と `.takt/ja` に callable gate workflow が存在し、implementation report と `changed_files` を固定 context として扱う。
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.2, 4.3, 4.4_
  - _Boundary:_ Callable Gate Workflow, Context Resolver Contract, AI Review Step
  - _Depends:_ 2.1, 2.2

- [x] 3. `kiro-impl` と downstream adapter を接続する
- [x] 3.1 `kiro-impl` の READY_FOR_REVIEW path に AI quality gate を挿入する
  - `execute-task` の `STATUS READY_FOR_REVIEW` を `ai-quality-gate` workflow_call step に送る。
  - gate `COMPLETE` は `review-task`、`need_replan` は `debug-task`、`ABORT` は `ABORT` に接続する。
  - OpenSpec / `opsx:*` や horizontal rollout workflow には触れない。
  - 完了時点で `execute-task -> ai-quality-gate -> review-task` の path が `.takt/en` と `.takt/ja` の両方に存在する。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 3.4, 4.3, 4.4, 7.3_
  - _Boundary:_ Kiro Impl Integration
  - _Depends:_ 2.3

- [x] 3.2 Kiro review adapter に gate evidence consumption を追加する
  - `kiro-ai-antipattern-review.md` と `kiro-ai-antipattern-fix.md` が存在する場合に読む入力契約を追加する。
  - unresolved findings、`NO_FIX_NEEDED` rationale、scope guard evidence を review verdict の判断材料に含める。
  - AI review を丸ごと再実行せず、gate evidence の受理可否を Kiro task review として確認する。
  - 完了時点で `review-task` instruction から、gate evidence 不備が `VERDICT REJECTED` に繋がることが分かる。
  - _Requirements: 3.4, 6.3, 7.1, 7.3_
  - _Boundary:_ Review Adapter
  - _Depends:_ 2.1, 3.1

- [x] 3.3 Kiro completion verification adapter に gate evidence check を追加する
  - `safe_to_update_progress` 判定前に gate fix status と review acceptance を確認する入力契約を追加する。
  - `FIXED` または evidence-backed `NO_FIX_NEEDED` だけを progress update 前の受理可能状態として扱う。
  - `update-progress` に AI report の再レビュー責務を追加しない。
  - 完了時点で `verify-task-completion` instruction から、unresolved AI findings が progress update を止める条件だと分かる。
  - _Requirements: 5.2, 6.4, 7.2, 7.4_
  - _Boundary:_ Verification Adapter
  - _Depends:_ 2.1, 3.2

- [x] 4. Workflow contract validation と drift tests を強化する
- [x] 4.1 Validator に AI quality gate workflow/facet catalog checks を追加する
  - gate workflow の存在、callable declaration、facet params、returns、loop threshold、report names を検査する。
  - gate workflow と fix facets の `.takt/en` / `.takt/ja` structural parity を検査する。
  - built-in AI antipattern resources への参照が解決できることを検査する。
  - 完了時点で gate workflow または fix contract を削除した fixture が validator failure になる。
  - _Requirements: 2.1, 2.2, 3.2, 4.2, 4.3, 6.1, 8.1, 8.3_
  - _Boundary:_ Validation Contract
  - _Depends:_ 2.3

- [x] 4.2 Validator に `kiro-impl` routing と downstream evidence checks を追加する
  - `execute-task -> review-task` の direct bypass を drift として検出する。
  - `call: kiro-ai-quality-gate` だけを allowed workflow_call とし、他の nested Kiro workflow 禁止は維持する。
  - `review-task` と `verify-task-completion` が gate report names と evidence terms を含むことを検査する。
  - `update-progress` が AI report を直接再レビューする責務を持たないことを検査する。
  - 完了時点で routing bypass、missing evidence hook、unwanted update-progress AI review がそれぞれ validator failure になる。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 5.2, 7.1, 7.2, 7.4, 8.1_
  - _Boundary:_ Validation Contract
  - _Depends:_ 3.3

- [x] 4.3 Drift fixture tests を追加する
  - direct `execute-task -> review-task` bypass を検出する test を追加する。
  - missing callable gate workflow、missing returns、threshold drift、missing report contract を検出する test を追加する。
  - missing review/verify evidence hook と language parity drift を検出する test を追加する。
  - 完了時点で `node:test` fixture suite が、AI quality gate contract の主要 drift を失敗として示せる。
  - _Requirements: 3.2, 4.2, 4.3, 5.2, 6.1, 7.1, 7.2, 7.4, 8.2, 8.3_
  - _Boundary:_ Validation Contract
  - _Depends:_ 4.1, 4.2

- [x] 5. Contract validation を通し、初期 rollout 境界を確認する
- [x] 5.1 Kiro iterative implementation workflow validation を通す
  - AI quality gate 追加後の repository state で validation script を実行する。
  - 対応する `node:test` suite を実行する。
  - 失敗があれば workflow/facet/validator の contract drift として修正する。
  - 完了時点で validation command と test command が成功し、gate contract の現行 repository smoke test も通る。
  - _Requirements: 8.1, 8.2, 8.3_
  - _Boundary:_ Validation Contract
  - _Depends:_ 4.3

- [x] 5.2 初期 rollout の scope guard を最終確認する
  - `.agents/skills/kiro-*`、`CC-SDD-CODEX.md`、OpenSpec / `opsx:*` workflows が変更対象に入っていないことを確認する。
  - `kiro-impl` 以外の Kiro workflow に AI quality gate を横展開していないことを確認する。
  - `update-progress` が `verify-task-completion` output だけに依存し、AI reports を直接読まないことを確認する。
  - 完了時点で初期 PR scope が design の Non-Goals と一致している。
  - _Requirements: 2.4, 5.2, 7.4, 8.4_
  - _Boundary:_ Kiro Impl Integration, TAKT Project Policy
  - _Depends:_ 5.1
