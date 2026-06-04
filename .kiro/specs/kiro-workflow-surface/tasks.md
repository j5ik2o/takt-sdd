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
    - _Depends:_ 1.1

  - [x] 1.3 root script surface を `npm run` で確認できる状態にする
    - `npm run` の script 一覧から `kiro:*` が正規 SDD surface として確認できる。
    - OpenSpec の `opsx:*` は別入口として残っていることを確認する。
    - _Requirements: 1.1, 1.4, 2.2_
    - _Boundary:_ ReleaseSurfaceMetadata, CanonicalKiroScripts
    - _Depends:_ 1.2

- [ ] 2. installer が配る script catalog を `kiro:*` canonical set に更新する
  - [x] 2.1 installer の SDD script catalog に canonical `kiro:*` set を追加する
    - 既存 project への script merge で `kiro:*` が追加対象になる。
    - 新規 `package.json` 生成時にも `kiro:*` と `opsx:*` が含まれる。
    - root package と installer の canonical `kiro:*` key set が一致する。
    - _Requirements: 1.2, 1.3, 5.1_
    - _Boundary:_ InstallerScriptCatalog, CanonicalKiroScripts
    - _Depends:_ 1.2

  - [ ] 2.2 installer の既存 script 保護と legacy shim 配布方針を維持する
    - 既存 script を上書きしない installer policy は維持する。
    - legacy shim scripts を導入先に追加する場合は、shim 実体も同じ install transaction で配置する。
    - 導入先 project が module-not-found ではなく migration guidance を返せる配置にする。
    - _Requirements: 1.2, 1.3, 3.5, 5.5_
    - _Boundary:_ InstallerScriptCatalog, LegacyCompatibilityShim
    - _Depends:_ 2.1

  - [ ] 2.3 root package と installer の script catalog 差分を検出できる fixture を用意する
    - root package と installer catalog の canonical `kiro:*` key set 比較に必要な test fixture または helper を追加する。
    - `opsx:*` が canonical Kiro set に混入していないことを確認できるようにする。
    - _Requirements: 5.1, 5.4_
    - _Boundary:_ InstallerScriptCatalog, SurfaceValidation
    - _Depends:_ 2.1

- [ ] 3. 旧 `cc-sdd:*` 用の fail-fast migration shim を追加する
  - [ ] 3.1 既知の旧 script 名に対する migration mapping を実装する
    - 旧 script 名ごとに `Script Mapping` 表で定義された `kiro:*` 移行先を表示する。
    - `cc-sdd:full` は `kiro:spec:quick` を案内し、legacy phase 名から `kiro:<phase>` を文字列補間しない。
    - 旧 script は実 workflow を起動せず、非ゼロ終了する。
    - _Requirements: 3.1, 3.2, 3.4, 5.3_
    - _Boundary:_ LegacyCompatibilityShim
    - _Depends:_ 1.2

  - [ ] 3.2 未知の legacy phase に generic migration guidance を返す
    - 未知の `cc-sdd:*` 実行でも、素の runtime error ではなく generic な migration guidance を表示する。
    - 未知 phase でも実 workflow を起動せず、非ゼロ終了する。
    - _Requirements: 3.1, 3.2, 3.4, 5.3_
    - _Boundary:_ LegacyCompatibilityShim
    - _Depends:_ 3.1

- [ ] 4. root package と installer に legacy shim script を接続する
  - [ ] 4.1 root `package.json` の旧 `cc-sdd:*` scripts を shim 呼び出しへ置き換える
    - root `package.json` の旧 `cc-sdd:*` scripts は migration shim を呼ぶ形に置き換える。
    - `cc-sdd:*` が `kiro:*` の alias として workflow を起動しないことを確認する。
    - _Requirements: 3.1, 3.2, 3.4, 5.3_
    - _Boundary:_ ReleaseSurfaceMetadata, LegacyCompatibilityShim
    - _Depends:_ 3.1

  - [ ] 4.2 installer が配る旧 `cc-sdd:*` scripts を root と同じ migration policy にそろえる
    - installer が配る旧 `cc-sdd:*` scripts も同じ migration shim 方針にそろえる。
    - installer fixture では導入先 project の `scripts/cc-sdd-migrate.mjs` または package-resolved shim が存在し、module-not-found にならないことを確認する。
    - root と installer の legacy script 挙動が同じ migration policy を示す。
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 5.5_
    - _Boundary:_ InstallerScriptCatalog, LegacyCompatibilityShim
    - _Depends:_ 2.2, 4.1

- [ ] 5. README の Kiro workflow 説明と migration table を更新する
  - [ ] 5.1 README の Kiro compatibility workflow section を `kiro:*` canonical の説明へ更新する
    - Kiro compatibility workflow section を `kiro:*` canonical の説明へ更新する。
    - OpenSpec `opsx:*` は別 workflow として維持されることを説明する。
    - 英語 README の実行例だけを見ても `kiro:*` へ移行できる。
    - _Requirements: 2.2, 2.3, 4.1_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 1.3

  - [ ] 5.2 README に `cc-sdd:*` から `kiro:*` への migration table を追加する
    - `cc-sdd:*` から `kiro:*` への対応表を追加する。
    - 旧入口が正規ではないことと、削除または shim 化の理由を説明する。
    - 利用者が command を置き換えられる粒度で移行先を示す。
    - _Requirements: 3.1, 3.3, 4.1, 4.4_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 3.1, 5.1

- [ ] 6. README.ja の Kiro workflow 説明を自然な日本語で更新する
  - [ ] 6.1 README.ja に README.md と同じ migration policy を反映する
    - README.md と同じ migration policy を日本語 README に反映する。
    - 破壊的変更であることと移行先を曖昧にせず説明する。
    - 日本語利用者が README.ja だけで command を置き換えられる。
    - _Requirements: 2.2, 2.3, 4.2, 4.4_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 5.2

  - [ ] 6.2 README.ja に残る旧 `cc-sdd:*` 正規入口表現を置き換える
    - `cc-sdd:*` を正規入口として案内する既存表現を置き換える。
    - 旧入口が必要な場合でも fail-fast migration shim として説明する。
    - _Requirements: 3.1, 3.3, 4.2, 4.4_
    - _Boundary:_ MigrationDocumentation
    - _Depends:_ 6.1

- [ ] 7. agent guidance を `kiro:*` / `$kiro-*` 正規 surface にそろえる
  - [ ] 7.1 Codex/Claude/common guidance の Kiro workflow 説明を更新する
    - Codex/Claude/common guidance の Kiro workflow 説明を確認し、旧 `cc-sdd:*` 正規入口表現を置き換える。
    - agent guidance から `$kiro-*` / `kiro:*` を正規入口として判断できる。
    - _Requirements: 4.3, 5.2_
    - _Boundary:_ AgentGuidanceSurface
    - _Depends:_ 5.2, 6.2

  - [ ] 7.2 agent guidance で OpenSpec workflow と Kiro workflow を混同しない説明にする
    - OpenSpec workflow と Kiro workflow を混同しない説明にする。
    - source asset resolution や workflow internals の詳細は後続 spec の範囲として残す。
    - _Requirements: 4.3, 5.2_
    - _Boundary:_ AgentGuidanceSurface
    - _Depends:_ 7.1

- [ ] 8. 公開 surface の script 整合性テストを追加する
  - [ ] 8.1 root package と installer catalog の canonical script set を検証する
    - root `package.json` と installer catalog から canonical `kiro:*` key set を検証する。
    - `opsx:*` が Kiro canonical set に混入していないことを検証する。
    - script set のずれが test failure として見える。
    - _Requirements: 5.1, 5.4_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 2.3

  - [ ] 8.2 legacy shim と installer 導入先 shim asset の検証を追加する
    - 旧 `cc-sdd:*` shim が `Script Mapping` の対応先を示して非ゼロ終了することを検証する。
    - installer 導入先 fixture で legacy shim が module-not-found にならず migration guidance を返すことを検証する。
    - `SurfaceValidationService` に `validateInstalledLegacyShimAsset()` を実装し、shim 実体の配布漏れを独立した failure として返す。
    - _Requirements: 5.3, 5.4, 5.5_
    - _Boundary:_ SurfaceValidation, LegacyCompatibilityShim
    - _Depends:_ 4.2, 8.1

- [ ] 9. README/agent guidance の旧 canonical 表現を検出するテストを追加する
  - [ ] 9.1 README/README.ja の `kiro:*` 実行例と migration table を検証する
    - README/README.ja に `kiro:*` 実行例と migration table があることを検証する。
    - 個別 `kiro-*` workflow YAML/facet の存在をこのテストの必須条件にしない。
    - _Requirements: 4.1, 4.2, 4.4, 5.4_
    - _Boundary:_ SurfaceValidation, MigrationDocumentation
    - _Depends:_ 5.2, 6.2

  - [ ] 9.2 agent guidance の旧 `cc-sdd:*` 正規入口表現を検出する
    - agent guidance が旧 `cc-sdd:*` を正規入口として案内していないことを検証する。
    - documentation drift が release 前に検出できる。
    - _Requirements: 4.3, 5.2, 5.4_
    - _Boundary:_ SurfaceValidation, AgentGuidanceSurface
    - _Depends:_ 7.2, 9.1

- [ ] 10. surface migration 全体を統合検証する
  - [ ] 10.1 package、installer、shim、README、agent guidance の変更をまとめて実行確認する
    - package、installer、shim、README、agent guidance の変更をまとめて実行確認する。
    - `kiro:*` が canonical、`cc-sdd:*` が fail-fast migration shim、`opsx:*` が分離入口であることを確認する。
    - 既存の installer/build/test コマンドに今回追加した検証が含まれることを確認する。
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_
    - _Boundary:_ ReleaseSurfaceMetadata, InstallerScriptCatalog, LegacyCompatibilityShim, MigrationDocumentation, AgentGuidanceSurface, SurfaceValidation
    - _Depends:_ 8.2, 9.2

  - [ ] 10.2 public `kiro:*` scripts の staged migration 挙動を確認する
    - public `kiro:*` scripts が後続 spec または既存 steering 系の workflow 実装へ接続されているか、未提供時は staged migration として明示的な fail-fast 案内を返すことを確認する。
    - 後続 Kiro workflow spec がこの surface を前提に実装へ進める状態にする。
    - _Requirements: 1.5, 5.4, 5.6_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 10.1

- [ ] 11. cross-spec release gate を後続 spec と既存 steering 系実装に照合する
  - [ ] 11.1 downstream spec と既存 steering 系実装の public workflow ownership を照合する
    - `kiro-spec-generation-workflows`、`kiro-status-validation-workflows`、`kiro-discovery-batch-workflows`、`kiro-iterative-implementation-workflow` と既存 steering 系実装が所有する public workflow identity と `CanonicalKiroScripts` の mapping を照合する。
    - workflow YAML/facet の実装が同一 PR stack に存在しない public `kiro:*` は、staged migration の明示的な fail-fast 案内へ接続されていることを確認する。
    - _Requirements: 1.5, 5.4, 5.6_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 10.2

  - [ ] 11.2 `SurfaceValidationService` に cross-spec release gate 検証を実装する
    - `SurfaceValidationService` に `validateCrossSpecReleaseGate()` を実装し、release readiness では素の workflow missing error を独立した failure として返す。
    - surface spec の unit test は個別 workflow の完成を必須にしないが、release readiness では素の workflow missing error を失敗として扱う。
    - _Requirements: 1.5, 5.4, 5.6_
    - _Boundary:_ SurfaceValidation, CanonicalKiroScripts
    - _Depends:_ 11.1

## Implementation Notes
