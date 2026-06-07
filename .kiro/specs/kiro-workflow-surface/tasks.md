# Implementation Plan

- [x] 1. package metadata と root script surface を `kiro:*` canonical に更新する
  - [x] 1.1 root package metadata を breaking Kiro surface release として更新する
    - root package の version を次の major version に上げる。
    - description または package metadata から Kiro-compatible TAKT workflow が主 surface であることを読み取れるようにする。
    - `opsx:*` scripts は OpenSpec workflow の入口として維持する。
    - _Requirements: 1.4, 2.1, 2.2, 2.3_
    - _Boundary:_ ReleaseSurfaceMetadata
    - _Depends:_ none

  - [x] 1.2 root package に canonical `kiro:*` script set を追加する
    - `kiro:discovery`、`kiro:spec:init`、`kiro:spec:requirements`、`kiro:validate:gap`、`kiro:spec:design`、`kiro:validate:design`、`kiro:spec:tasks`、`kiro:spec:quick`、`kiro:spec:batch`、`kiro:spec:status`、`kiro:impl`、`kiro:validate:impl`、`kiro:steering`、`kiro:steering-custom` を root scripts に追加する。
    - script value は `takt --pipeline --skip-git -w kiro-* -t` 形式の canonical workflow identity に接続する。
    - `cc-sdd:*` や `opsx:*` を canonical Kiro set に混入させない。
    - _Requirements: 1.1, 1.4, 2.1, 2.2_
    - _Boundary:_ ReleaseSurfaceMetadata, CanonicalKiroScripts
    - _Depends:_ 1

  - [x] 1.3 root script surface を `npm run` で確認できる状態にする
    - `npm run` の script 一覧から `kiro:*` が正規 SDD surface として確認できる。
    - OpenSpec の `opsx:*` は別入口として残っていることを確認する。
    - _Requirements: 1.1, 1.4, 2.2_
    - _Boundary:_ ReleaseSurfaceMetadata, CanonicalKiroScripts
    - _Depends:_ 1

- [ ] 2. installer が配る script catalog を `kiro:*` canonical set に更新する
  - [x] 2.1 installer の SDD script catalog に canonical `kiro:*` set を追加する
    - 既存 project への script merge で `kiro:*` が追加対象になる。
    - 新規 `package.json` 生成時にも `kiro:*` と `opsx:*` が含まれる。
    - root package と installer の canonical `kiro:*` key set が一致する。
    - _Requirements: 1.2, 1.3, 5.1_
    - _Boundary:_ InstallerScriptCatalog, CanonicalKiroScripts
    - _Depends:_ 1

  - [ ] 2.2 installer の既存 script 保護と legacy script 維持方針を維持する
    - 既存 script を上書きしない installer policy は維持する。
    - 既存 `cc-sdd:*` scripts は上書きせず、既存 `cc-sdd-*` workflow を引き続き実行できるようにする。
    - 新規 project に legacy scripts を含める場合も `kiro:*` alias にはしない。
    - _Requirements: 1.2, 1.3, 3.5, 5.5_
    - _Boundary:_ InstallerScriptCatalog, LegacyDeprecationPolicy
    - _Depends:_ 2

  - [ ] 2.3 root package と installer の script catalog 差分を検出できる fixture を用意する
    - root package と installer catalog の canonical `kiro:*` key set 比較に必要な test fixture または helper を追加する。
    - `opsx:*` が canonical Kiro set に混入していないことを確認できるようにする。
    - _Requirements: 5.1, 5.4_
    - _Boundary:_ InstallerScriptCatalog, SurfaceValidation
    - _Depends:_ 2

- [ ] 3. 旧 `cc-sdd:*` の非推奨方針と migration mapping を定義する
  - [ ] 3.1 既知の旧 script 名に対する migration mapping を文書化する
    - 旧 script 名ごとに `Script Mapping` 表で定義された `kiro:*` 移行先を表示する。
    - `cc-sdd:full` は `kiro:spec:quick` を案内し、legacy phase 名から `kiro:<phase>` を文字列補間しない。
    - 旧 script は既存 `cc-sdd-*` workflow として維持し、`kiro:*` alias にはしない。
    - _Requirements: 3.1, 3.2, 3.4, 5.3_
    - _Boundary:_ LegacyDeprecationPolicy, MigrationDocumentation
    - _Depends:_ 1

  - [ ] 3.2 legacy script が既存 workflow を指すことを明文化する
    - 既知の `cc-sdd:*` は既存 `cc-sdd-*` workflow を指す。
    - `cc-sdd:*` を実行時に失敗する移行専用入口へ置き換えない。
    - _Requirements: 3.1, 3.2, 3.4, 5.3_
    - _Boundary:_ LegacyDeprecationPolicy
    - _Depends:_ 3

- [ ] 4. root package と installer の legacy script 維持を検証する
  - [ ] 4.1 root `package.json` の旧 `cc-sdd:*` scripts を既存 workflow 参照として維持する
    - root `package.json` の旧 `cc-sdd:*` scripts は既存 `cc-sdd-*` workflow を呼ぶ形で維持する。
    - `cc-sdd:*` が `kiro:*` の alias になっていないことを確認する。
    - _Requirements: 3.1, 3.2, 3.4, 5.3_
    - _Boundary:_ ReleaseSurfaceMetadata, LegacyDeprecationPolicy
    - _Depends:_ 3

  - [ ] 4.2 installer が配る旧 `cc-sdd:*` scripts を root と同じ deprecation policy にそろえる
    - installer が配る旧 `cc-sdd:*` scripts も既存 `cc-sdd-*` workflow を指す方針にそろえる。
    - installer fixture では導入先 project の legacy scripts が module-not-found にならないことを確認する。
    - root と installer の legacy script 挙動が同じ deprecation policy を示す。
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 5.5_
    - _Boundary:_ InstallerScriptCatalog, LegacyDeprecationPolicy
    - _Depends:_ 2, 4.1

- [ ] 5. README の Kiro workflow 説明と migration table を更新する
  - [ ] 5.1 README の Kiro compatibility workflow section を `kiro:*` canonical の説明へ更新する
    - Kiro compatibility workflow section を `kiro:*` canonical の説明へ更新する。
    - OpenSpec `opsx:*` は別 workflow として維持されることを説明する。
    - 英語 README の実行例だけを見ても `kiro:*` へ移行できる。
    - _Requirements: 2.2, 2.3, 4.1_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 1

  - [ ] 5.2 README に `cc-sdd:*` から `kiro:*` への migration table を追加する
    - `cc-sdd:*` から `kiro:*` への対応表を追加する。
    - 旧入口が正規ではないことと、既存互換として維持する理由を説明する。
    - 利用者が command を置き換えられる粒度で移行先を示す。
    - _Requirements: 3.1, 3.3, 4.1, 4.4_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 3, 5

- [ ] 6. README.ja の Kiro workflow 説明を自然な日本語で更新する
  - [ ] 6.1 README.ja に README.md と同じ migration policy を反映する
    - README.md と同じ migration policy を日本語 README に反映する。
    - 破壊的変更であることと移行先を曖昧にせず説明する。
    - 日本語利用者が README.ja だけで command を置き換えられる。
    - _Requirements: 2.2, 2.3, 4.2, 4.4_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 5

  - [ ] 6.2 README.ja に残る旧 `cc-sdd:*` 正規入口表現を置き換える
    - `cc-sdd:*` を正規入口として案内する既存表現を置き換える。
    - 旧入口が必要な場合でも既存互換の非推奨入口として説明する。
    - _Requirements: 3.1, 3.3, 4.2, 4.4_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 6

- [ ] 7. agent guidance を `kiro:*` / `$kiro-*` 正規 surface にそろえる
  - [ ] 7.1 Codex/Claude/common guidance の Kiro workflow 説明を更新する
    - Codex/Claude/common guidance の Kiro workflow 説明を確認し、旧 `cc-sdd:*` 正規入口表現を置き換える。
    - agent guidance から `$kiro-*` / `kiro:*` を正規入口として判断できる。
    - _Requirements: 4.3, 5.2_
    - _Boundary:_ AgentGuidanceSurface
    - _Depends:_ 5, 6

  - [ ] 7.2 agent guidance で OpenSpec workflow と Kiro workflow を混同しない説明にする
    - OpenSpec workflow と Kiro workflow を混同しない説明にする。
    - source asset resolution や workflow internals の詳細は後続 spec の範囲として残す。
    - _Requirements: 4.3, 5.2_
    - _Boundary:_ AgentGuidanceSurface
    - _Depends:_ 7

- [ ] 8. 公開 surface の script 整合性テストを追加する
  - [ ] 8.1 root package と installer catalog の canonical script set を検証する
    - root `package.json` と installer catalog から canonical `kiro:*` key set を検証する。
    - `opsx:*` が Kiro canonical set に混入していないことを検証する。
    - script set のずれが test failure として見える。
    - _Requirements: 5.1, 5.4_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 2

  - [ ] 8.2 legacy script と installer 導入先 script の検証を追加する
    - 旧 `cc-sdd:*` scripts が `kiro:*` alias や実行時失敗専用入口ではないことを検証する。
    - installer 導入先 fixture で legacy scripts が module-not-found にならず既存 workflow を指すことを検証する。
    - `SurfaceValidationService` に `validateInstalledLegacyScripts()` を実装し、legacy script の配布漏れを独立した failure として返す。
    - _Requirements: 5.3, 5.4, 5.5_
    - _Boundary:_ SurfaceValidation, LegacyDeprecationPolicy
    - _Depends:_ 4, 8

- [ ] 9. README/agent guidance の旧 canonical 表現を検出するテストを追加する
  - [ ] 9.1 README/README.ja の `kiro:*` 実行例と migration table を検証する
    - README/README.ja に `kiro:*` 実行例と migration table があることを検証する。
    - 個別 `kiro-*` workflow YAML/facet の存在をこのテストの必須条件にしない。
    - _Requirements: 4.1, 4.2, 4.4, 5.4_
    - _Boundary:_ SurfaceValidation, MigrationDocumentation
    - _Depends:_ 5, 6

  - [ ] 9.2 agent guidance の旧 `cc-sdd:*` 正規入口表現を検出する
    - agent guidance が旧 `cc-sdd:*` を正規入口として案内していないことを検証する。
    - documentation drift が release 前に検出できる。
    - _Requirements: 4.3, 5.2, 5.4_
    - _Boundary:_ SurfaceValidation, AgentGuidanceSurface
    - _Depends:_ 7, 9

- [ ] 10. surface migration 全体を統合検証する
  - [ ] 10.1 package、installer、README、agent guidance の変更をまとめて実行確認する
    - package、installer、README、agent guidance の変更をまとめて実行確認する。
    - `kiro:*` が canonical、`cc-sdd:*` が既存互換の非推奨入口、`opsx:*` が分離入口であることを確認する。
    - 既存の installer/build/test コマンドに今回追加した検証が含まれることを確認する。
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_
    - _Boundary:_ ReleaseSurfaceMetadata, InstallerScriptCatalog, LegacyDeprecationPolicy, MigrationDocumentation, AgentGuidanceSurface, SurfaceValidation
    - _Depends:_ 8, 9

  - [ ] 10.2 public `kiro:*` scripts の staged migration 挙動を確認する
    - public `kiro:*` scripts が後続 spec または既存 steering 系の workflow 実装へ接続されているか、未提供時は staged migration として明示的な案内を返すことを確認する。
    - 後続 Kiro workflow spec がこの surface を前提に実装へ進める状態にする。
    - _Requirements: 1.5, 5.4, 5.6_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 10

- [ ] 11. cross-spec release gate を後続 spec と既存 steering 系実装に照合する
  - [ ] 11.1 downstream spec と既存 steering 系実装の public workflow ownership を照合する
    - `kiro-spec-generation-workflows`、`kiro-status-validation-workflows`、`kiro-discovery-batch-workflows`、`kiro-iterative-implementation-workflow` と既存 steering 系実装が所有する public workflow identity と `CanonicalKiroScripts` の mapping を照合する。
    - workflow YAML/facet の実装が同一 PR stack に存在しない public `kiro:*` は、staged migration の明示的な案内へ接続されていることを確認する。
    - _Requirements: 1.5, 5.4, 5.6_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 10

  - [ ] 11.2 `SurfaceValidationService` に cross-spec release gate 検証を実装する
    - `SurfaceValidationService` に `validateCrossSpecReleaseGate()` を実装し、release readiness では素の workflow missing error を独立した failure として返す。
    - surface spec の unit test は個別 workflow の完成を必須にしないが、release readiness では素の workflow missing error を失敗として扱う。
    - _Requirements: 1.5, 5.4, 5.6_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 11

- [ ] 12. 2026-06-07 方針補正を反映する
  - 旧 `cc-sdd:*` を実行時に失敗する移行専用入口へ置き換えるタスクは採用せず、既存 `cc-sdd-*` workflow を維持して非推奨案内だけを追加する。
  - `cc-sdd:*` を `kiro:*` の透過 alias にしないことを validation に含める。
  - README/README.ja/agent guidance では、旧 `cc-sdd:*` を既存互換、`kiro:*` を新規推奨として説明する。
  - unreleased の既存 `kiro-*` workflow/facet は互換維持対象にせず、Kiro skill 継承の closed-loop workflow として削除または再作成する。
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4_
  - _Boundary:_ SurfaceValidation, AgentGuidanceSurface, ScriptSurfaceCatalog
  - _Depends:_ none

## Implementation Notes
