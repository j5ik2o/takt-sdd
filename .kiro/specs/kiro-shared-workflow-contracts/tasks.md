# Implementation Plan

- [x] 1. Kiro shared contract の validation harness を追加する
  - Kiro output contract、skill identity fixture、artifact lifecycle terms、optional workflow references を検証できる repository-local check を追加する。
  - downstream `kiro-*.yaml` が未作成でも failure にしない scope guard を含める。
  - 完了時点で shared contract files が未作成の場合は、どの contract が missing かを validation result で確認できる。
  - _Requirements: 1.6, 2.5, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Boundary:_ SharedContractValidationHarness
  - _Depends:_ none

- [x] 2. status と validation result の output contract を追加する
  - feature existence、phase、approval、ready 判定を返す status contract を en/ja に追加する。
  - `PASS`、`FAIL`、`NEEDS_FIX`、`BLOCKED` と evidence を返す validation result contract を en/ja に追加する。
  - 完了時点で validation harness が status/validation の required machine fields と enum を検出できる。
  - _Requirements: 1.1, 1.2, 1.6, 5.1, 6.1_
  - _Boundary:_ KiroOutputContractCatalog, ContractFacetBundle
  - _Depends:_ 1

- [x] 3. review verdict と debug decision の output contract を追加する
  - `VERDICT: APPROVED | REJECTED`、actionable findings、requirement/task references を返す review supplement contract を追加する。
  - root cause、selected action、retry eligibility、abort reason を返す debug decision contract を追加する。
  - 完了時点で downstream review/debug workflow が machine verdict を rule condition に使える contract shape を参照できる。
  - _Requirements: 1.3, 1.4, 1.6, 5.1, 6.1_
  - _Boundary:_ KiroOutputContractCatalog, ContractFacetBundle
  - _Depends:_ 1

- [x] 4. completion verification の output contract を追加する
  - 完了可否、未完了項目、検証証跡を返す completion verification contract を en/ja に追加する。
  - `COMPLETE`、`INCOMPLETE`、`BLOCKED` の verdict が human summary と分離されていることを validation 対象にする。
  - 完了時点で implementation workflow の完了判定が shared contract を参照できる。
  - _Requirements: 1.5, 1.6, 5.1, 6.1, 6.2_
  - _Boundary:_ KiroOutputContractCatalog, ContractFacetBundle
  - _Depends:_ 1

- [x] 5. skill identity resolver の instruction contract を追加する
  - `$kiro-*`、`/kiro-*`、`kiro-*`、`kiro:*` の代表入力を canonical skill identity へ正規化する規約を追加する。
  - `.agents/skills/kiro-*` と `.claude/skills/kiro-*` の source root lookup と fallback を明示する。
  - 完了時点で `kiro-impl`、`$kiro-impl`、`/kiro-impl`、`kiro:impl` が同じ identity として validation fixture で確認できる。
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 6.4_
  - _Boundary:_ SkillIdentityResolver
  - _Depends:_ 1

- [x] 6. skill resolution error を shared output contract と接続する
  - unknown skill と missing source root の error category を output contract 側に追加する。
  - downstream workflow が `BLOCKED` または abort として扱える machine field を明示する。
  - 完了時点で source root が見つからない fixture が supported error category として validation される。
  - _Requirements: 2.3, 5.2, 6.1, 6.2_
  - _Boundary:_ SkillIdentityResolver, KiroOutputContractCatalog
  - _Depends:_ 2, 5

- [x] 7. `.kiro/*` artifact operation policy を追加する
  - `.kiro/steering/roadmap.md` と存在する steering files の読み込み規約を追加する。
  - `.kiro/specs/<feature>/`、`brief.md`、`requirements.md`、`design.md`、`tasks.md`、`spec.json` の存在確認規約を追加する。
  - OpenSpec artifacts を `.kiro/*` contract に取り込まない boundary を明記する。
  - 完了時点で downstream workflow が artifact missing と feature missing を同じ policy から判断できる。
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 5.3, 6.1_
  - _Boundary:_ KiroArtifactAccessPolicy
  - _Depends:_ 1

- [x] 8. artifact error categories を output contract と validation に追加する
  - `FEATURE_NOT_FOUND`、`ARTIFACT_MISSING`、`SPEC_JSON_INVALID`、`LIFECYCLE_INCONSISTENT` などの共通カテゴリを定義する。
  - phase と artifact の矛盾を downstream workflow が修復、停止、次 phase へ進む判断に使える形へそろえる。
  - 完了時点で validation harness が artifact policy と output contract の error category drift を検出できる。
  - _Requirements: 3.4, 5.3, 6.1, 6.3_
  - _Boundary:_ KiroArtifactAccessPolicy, KiroOutputContractCatalog
  - _Depends:_ 2, 7

- [x] 9. `spec.json` lifecycle policy を追加する
  - requirements/design/tasks phase 完了時の `phase`、`generated`、`approved`、`ready_for_implementation` の期待状態を定義する。
  - auto-approve mode と通常 mode の更新差分を明示する。
  - 完了時点で lifecycle policy から各 phase の expected state を validation harness が検出できる。
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3_
  - _Boundary:_ SpecLifecycleStateContract
  - _Depends:_ 1

- [x] 10. Kiro workflow reference rules を validation に追加する
  - `.takt/{en,ja}/workflows/kiro-*.yaml` が存在する場合に shared facet reference を解決できることを検証する。
  - workflow YAML が存在しないこと自体は failure にしない。
  - 完了時点で下流 workflow が shared contract 名を誤って参照した場合に validation failure として見える。
  - _Requirements: 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_
  - _Boundary:_ KiroWorkflowReferenceRules, SharedContractValidationHarness
  - _Depends:_ 2, 3, 4, 5, 7, 9

- [x] 11. built-in facet inheritance policy を追加する
  - Kiro-specific facet が built-in facet と責務を共有する場合、`extends` による差分記述を優先する policy を定義する。
  - `extends` は TAKT 0.43.0 が解決できる `{extends: parent}` の bare facet name を基本形にし、同じ facet kind の built-in parent を参照する。
  - validation harness は親 facet の存在、TAKT runtime の inheritance 対応、full custom の理由有無を検出する。
  - 完了時点で親 facet 不在は `BUILTIN_FACET_NOT_FOUND`、runtime 未対応は `FACET_EXTENDS_UNSUPPORTED` として見える。
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Boundary:_ BuiltinFacetInheritancePolicy, SharedContractValidationHarness
  - _Depends:_ 1

- [x] 12. shared contract validation を test command に接続する
  - validation harness を test runner から実行できる regression test として接続する。
  - enum、field、language pair、skill fixture、artifact lifecycle、built-in facet inheritance、optional workflow reference の check がまとめて実行される。
  - 完了時点で repository の通常検証から shared contract drift を検出できる。
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 7.4_
  - _Boundary:_ SharedContractValidationHarness
  - _Depends:_ 10, 11

- [x] 13. 下流 spec 向けの共通契約参照を最終検証する
  - status/validation/spec generation/discovery/implementation の各下流 spec が参照できる contract 名と boundary を確認する。
  - 下流 spec が built-in facet inheritance policy を使い、親 facet の全文コピーを前提にしていないことを確認する。
  - `kiro-workflow-surface` の `kiro:*` namespace と矛盾する identity がないことを確認する。
  - 完了時点で downstream workflow の実装者が本 spec の contract を参照し、個別 workflow logic を重複定義せずに進められる。
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.5_
  - _Boundary:_ ContractFacetBundle, KiroWorkflowReferenceRules, BuiltinFacetInheritancePolicy
  - _Depends:_ 12

## Implementation Notes

- `scripts/validate-kiro-shared-contracts.mjs` と `tests/kiro-shared-workflow-contracts.test.mjs` を追加し、output contract enum、skill identity fixtures、artifact/lifecycle terms、built-in facet inheritance、optional `kiro-*.yaml` reference を検証する。
- Kiro shared output contracts は en/ja で同じ machine field と enum を持ち、human summary を workflow branching に使わないことを明記した。
- TAKT 0.43.0 の runtime semantics に合わせ、facet inheritance は frontmatter ではなく `{extends: validation}` の単独行 directive と bare parent name を検証する。
- 検証済みコマンド: `npm run validate:kiro-shared-contracts`、`npm run test:kiro-shared-contracts`、`npm run build` in `installer/`、`node installer/dist/cli.js --dry-run --lang en`、`node installer/dist/cli.js --dry-run --lang ja`、`node installer/dist/cli.js --help`、`.takt/{en,ja}/workflows/*.yaml` の `takt prompt` validation。
- 2026-06-07: `validate-kiro-shared-contracts.mjs` に `extends_skill` / `extends_skill_section` validation、Kiro skill field contract validation、`workflow_call` / shell `takt -w` / custom retry source-of-truth rejection を追加した。
- 2026-06-07: Existing Kiro instruction facets now declare Kiro skill adapter frontmatter or an explicit `Full custom skill reason`; review/debug/validation output contracts preserve shared names while exposing Kiro primary fields `VERDICT`, `NEXT_ACTION`, and `DECISION`.

- [x] 14. Kiro skill inheritance validation を追加する
  - Kiro-specific instruction facet の frontmatter に `extends_skill` と `extends_skill_section` を要求する。
  - `extends_skill_section` が `.agents/skills/kiro-*` または `.claude/skills/kiro-*` の `SKILL.md` に存在することを検証する。
  - en/ja adapter facet の参照 skill、section heading、machine field、enum が一致することを検証する。
  - Kiro skill 本文の長いコピーを `SKILL_BODY_COPY_DETECTED` として検出する。
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - _Boundary:_ KiroSkillInheritancePolicy, SharedContractValidationHarness
  - _Depends:_ 11, 12

- [x] 15. Kiro workflow shape と loop monitor validation を追加する
  - generation / implementation workflow が単一 prompt step wrapper でないことを検出する。
  - read-only status/validation workflow が collect、classify/validate、report の shape に閉じ、artifact 更新 loop を持たないことを検出する。
  - 再実行上限が `loop_monitors.threshold` にだけ存在し、facet frontmatter、validator、独自 retry counter に重複していないことを検証する。
  - `workflow_call`、shell 経由の `takt -w`、workflow-to-workflow の再起動を Kiro workflow から排除する。
  - Kiro-specific facet が workflow から参照されず残っている場合は validation failure にする。
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - _Boundary:_ KiroWorkflowShapeRules, KiroWorkflowReferenceRules, SharedContractValidationHarness
  - _Depends:_ 14

- [x] 16. Kiro skill field contract へ output contract を再整合する
  - `kiro-impl` implementer の `STATUS`、`kiro-review` の `VERDICT`、`kiro-debug` の `NEXT_ACTION`、`kiro-validate-impl` の `DECISION` を primary machine field として validation する。
  - 既存 `kiro-validation-result`、`kiro-review-verdict`、`kiro-debug-decision`、`kiro-completion-verification` を補助 contract として残す場合も Kiro skill field を上書きしない。
  - workflow rule が独自 `validation.verdict` や `review.verdict` へ翻訳していないことを検証する。
  - 下流 spec generation / status / discovery / implementation workflow の validator が同じ field contract を参照できるようにする。
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - _Boundary:_ KiroSkillFieldContract, KiroOutputContractCatalog, SharedContractValidationHarness
  - _Depends:_ 14, 15
