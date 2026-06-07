# Implementation Plan

- [x] 1. Kiro status/validation workflow の validation harness を追加する
  - en/ja の workflow file、instruction facet、shared contract reference を検証できる repository-local check を追加する。
  - `kiro-spec-status`、`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` が未作成の場合に missing file を明示する。
  - 完了時点で shared contract が未作成の場合も、どの reference が不足しているかを validation failure として確認できる。
  - 完了時点で `package.json` の repository-local validation script から harness を実行できる。
  - _Requirements: 6.2, 6.4_
  - _Boundary:_ StatusValidationWorkflowValidationHarness
  - _Depends:_ none

- [x] 2. status reporting の instruction facet を追加する
  - feature existence、`spec.json` phase、approvals、ready-for-implementation、phase artifact consistency を読む手順を en/ja に追加する。
  - missing feature、missing artifact、invalid lifecycle を分けて status result に渡す規約を明示する。
  - 完了時点で `kiro-report-spec-status` facet が read-only status 判定の入力と出力を説明できる。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1_
  - _Boundary:_ KiroSpecStatusWorkflow
  - _Depends:_ 1

- [x] 3. gap validation の instruction facet を追加する
  - requirements artifact、current codebase evidence、missing components、integration points、recommended next action を確認する手順を en/ja に追加する。
  - requirements が不足している場合の `FAIL` または `BLOCKED` と、codebase evidence が不足している場合の `MANUAL_VERIFICATION_REQUIRED` finding を分ける。
  - 完了時点で `kiro-validate-gap-readiness` facet が artifact 更新なしで gap validation verdict を組み立てられる。
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.4, 6.1_
  - _Boundary:_ KiroGapValidationWorkflow
  - _Depends:_ 1

- [x] 4. design validation の instruction facet を追加する
  - requirements coverage、Boundary Commitments、File Structure Plan、validation hooks を確認する手順を en/ja に追加する。
  - design artifact 不足、approval 矛盾、下流責務の吸収を actionable finding として返す規約を明示する。
  - 完了時点で `kiro-validate-design-readiness` facet が design.md を修正せずに shared validation verdict を返せる。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 6.1_
  - _Boundary:_ KiroDesignValidationWorkflow
  - _Depends:_ 1

- [x] 5. implementation validation の instruction facet を追加する
  - tasks artifact、ready-for-implementation、task checkbox、test/build evidence、remaining manual verification を確認する手順を en/ja に追加する。
  - incomplete work、evidence mismatch、`MANUAL_VERIFICATION_REQUIRED` finding を分けて返す規約を明示する。
  - 完了時点で `kiro-validate-impl-readiness` facet が task execution と checkbox 更新なしで completion gate を判定できる。
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.4, 6.1_
  - _Boundary:_ KiroImplValidationWorkflow
  - _Depends:_ 1

- [x] 6. evidence collection の共通 instruction facet を追加する
  - observed evidence、missing evidence、`MANUAL_VERIFICATION_REQUIRED` finding を分離する共通手順を en/ja に追加する。
  - evidence のない項目を `PASS` の根拠に含めないルールを validation workflow 共通で使えるようにする。
  - 完了時点で gap validation と implementation validation が同じ evidence separation 語彙を参照できる。
  - _Requirements: 2.3, 4.1, 4.3, 5.2, 5.4_
  - _Boundary:_ KiroEvidenceCollector
  - _Depends:_ 3, 5

- [x] 7. status workflow YAML を追加する
  - `kiro-spec-status` workflow を en/ja に追加し、status instruction facet と shared `kiro-status` contract を参照する。
  - feature missing、artifact missing、lifecycle inconsistency、ready state の分岐を workflow step と output mapping に反映する。
  - 完了時点で workflow validation harness が `kiro-spec-status.yaml` の facet reference と read-only boundary を検出できる。
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 6.1_
  - _Boundary:_ KiroSpecStatusWorkflow, KiroReadinessEvaluator, KiroValidationOutputMapper
  - _Depends:_ 2

- [x] 8. gap validation workflow YAML を追加する
  - `kiro-validate-gap` workflow を en/ja に追加し、gap instruction facet、readiness facet に埋め込んだ evidence collection 語彙、shared validation result contract を参照する。
  - requirements 不足時の `FAIL` または `BLOCKED` と evidence 不足時の `MANUAL_VERIFICATION_REQUIRED` finding を output mapping に反映する。
  - 完了時点で workflow が artifact 生成や design/tasks 更新を行わないことを validation harness で確認できる。
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.4, 6.1_
  - _Boundary:_ KiroGapValidationWorkflow, KiroEvidenceCollector, KiroValidationOutputMapper
  - _Depends:_ 3, 6

- [x] 9. design validation workflow YAML を追加する
  - `kiro-validate-design` workflow を en/ja に追加し、design instruction facet と shared validation result contract を参照する。
  - coverage、boundary、file structure、lifecycle inconsistency の findings を shared validation verdict に写像する。
  - 完了時点で workflow が design.md の自動修正を含まないことを validation harness で確認できる。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.3, 6.1_
  - _Boundary:_ KiroDesignValidationWorkflow, KiroReadinessEvaluator, KiroValidationOutputMapper
  - _Depends:_ 4

- [x] 10. implementation validation workflow YAML を追加する
  - `kiro-validate-impl` workflow を en/ja に追加し、implementation validation facet、readiness facet に埋め込んだ evidence collection 語彙、shared validation result contract を参照する。
  - tasks/ready state 不足、unchecked task、test/build evidence mismatch、manual verification remaining を `findings` と verdict に写像する。
  - 完了時点で workflow が implementation task execution と tasks.md checkbox 更新を含まないことを validation harness で確認できる。
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 5.4, 6.1_
  - _Boundary:_ KiroImplValidationWorkflow, KiroEvidenceCollector, KiroReadinessEvaluator, KiroValidationOutputMapper
  - _Depends:_ 5, 6

- [x] 11. status/validation workflow の regression test を追加する
  - validation harness を test runner から実行し、en/ja file parity、shared contract reference、read-only boundary、OpenSpec separation を検証する。
  - workflow YAML が shared Kiro contract ではなく旧 cc-sdd contract だけを参照した場合に failure になるようにする。
  - `validate:kiro-status-validation-workflows` と `test:kiro-status-validation-workflows` を repository-local command として追加する。
  - 完了時点で repository-local test から Kiro status/validation workflow drift を検出できる。
  - _Requirements: 5.1, 6.2, 6.4_
  - _Boundary:_ StatusValidationWorkflowValidationHarness
  - _Depends:_ 7, 8, 9, 10

- [x] 12. downstream workflow から参照できる output boundary を最終検証する
  - `kiro-spec-generation-workflows` と `kiro-iterative-implementation-workflow` が参照する status/readiness/verdict 語彙が shared contract と矛盾しないことを確認する。
  - `kiro:*` script surface の ownership を吸収せず、workflow 名だけが surface spec と整合することを確認する。
  - 完了時点で downstream workflow が task selection や generation prompt の詳細なしに status/validation result を分岐条件として使える。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 6.4_
  - _Boundary:_ KiroValidationOutputMapper, StatusValidationWorkflowValidationHarness
  - _Depends:_ 11

- [x] 13. status/validation facets の built-in 継承候補を棚卸しする
  - `node_modules/takt/builtins/{en,ja}/facets` の validation/review 系 instruction、policy、output contract を確認し、各 Kiro-specific facet の親候補を記録する。
  - 親候補がある facet は shared `BuiltinFacetInheritancePolicy` の `{extends: parent}` 単独行 directive を使い、Kiro 固有の `.kiro/*` lifecycle 判定だけを差分として記述する。
  - 親候補がない、または full custom が必要な facet は理由を design note または validation finding に残す。
  - 完了時点で status/validation validation harness が親 facet 不在、runtime 未対応、全文コピー前提を検出できる。
  - _Requirements: 6.5_
  - _Boundary:_ StatusValidationWorkflowValidationHarness
  - _Depends:_ 7

- [x] 14. read-only multi-step workflow shape へ再作成する
  - `kiro-spec-status`、`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` を evidence collection、classification/validation、report の step sequence として再作成する。
  - 単一 prompt step wrapper、artifact write step、repair step、debug step を validation failure として検出する。
  - read-only workflow が `.kiro/*` と repository evidence を読むだけで、tasks.md checkbox や design.md を更新しないことを確認する。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.4_
  - _Boundary:_ KiroSpecStatusWorkflow, KiroGapValidationWorkflow, KiroDesignValidationWorkflow, KiroImplValidationWorkflow, StatusValidationWorkflowValidationHarness
  - _Depends:_ 13

- [x] 15. Kiro validation skill thin adapter へ facets を再整合する
  - `kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` の instruction facet に `extends_skill` と `extends_skill_section` を持たせる。
  - Kiro skill 本文を facet にコピーせず、TAKT input/output/rule mapping と read-only boundary だけを差分として記述する。
  - en/ja facet の Kiro skill section、machine field、enum が一致することを validation に追加する。
  - TAKT built-in facet を使う policy/output/persona は結線を確認し、未使用なら削除する。
  - _Requirements: 7.2, 7.3, 7.4, 8.2, 8.5_
  - _Boundary:_ StatusValidationWorkflowValidationHarness, KiroValidationOutputMapper
  - _Depends:_ 14

- [x] 16. Kiro skill field contract に output mapping を合わせる
  - `kiro-validate-impl` の `DECISION: GO | NO-GO | MANUAL_VERIFY_REQUIRED` を primary machine field として workflow rule に接続する。
  - `validation.verdict` は補助分類に限定し、Kiro skill field を上書きしない。
  - `kiro-validate-design` と `kiro-validate-gap` も参照元 skill が定義する field を primary として扱う。
  - downstream generation / implementation workflow が同じ field contract を参照できることを regression test に含める。
  - _Requirements: 7.4, 8.3_
  - _Boundary:_ KiroValidationOutputMapper, StatusValidationWorkflowValidationHarness
  - _Depends:_ 15
