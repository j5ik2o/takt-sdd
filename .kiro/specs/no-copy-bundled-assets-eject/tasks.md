# 実装計画

- [ ] 1. 基盤: asset 解決と workflow 実行前提を切り替える
- [x] 1.1 AssetResolution の read-only 解決を追加する
  - config、manifest、default の順で language を解決し、config 専用の language 読み取りも分離する。
  - project root override、project language override、package bundled workflow の順で workflow source を解決する。
  - `ja` 解決時に `en` へ fallback しないことを解決規約として固定する。
  - 完了時点で `.takt/` がない project でも package 側 workflow source を返せる。
  - _Requirements:_ 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.6, 7.1, 7.5
  - _Boundary:_ AssetResolution
  - _Depends:_ none

- [x] 1.2 WorkflowRunner を package bundled runtime 前提へ更新する
  - preflight を language と workflow source の存在確認へ絞り、project-local `takt` binary の有無を実行可否に使わない。
  - selected workflow path だけを TAKT に渡し、package workflow と project facets の暗黙混在を作らない。
  - missing workflow error は workflow name と language を示し、`init` 実行を求めない。
  - 完了時点で packageRoot 側の `takt` dependency だけで supported workflow を起動できる。
  - _Requirements:_ 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 2.5, 2.6, 7.1, 7.2, 7.5
  - _Boundary:_ WorkflowRunner
  - _Depends:_ 1.1

- [ ] 2. 廃止導線と help surface を安全化する
- [x] 2.1 `takt-sdd init` を retired guidance のみに変更する
  - help は deprecated help を表示して成功終了し、help 以外は旧 option を検証せず retired guidance を返す。
  - installer core、asset copy、manifest、script、package metadata の書き込み経路へ到達しないようにする。
  - guidance で package bundled assets を通常利用することと、カスタマイズには `eject` を使うことを示す。
  - 完了時点で `init` 通常実行は exit 1 かつ project files を変更しない。
  - _Requirements:_ 3.1, 3.2, 3.3, 3.4, 3.5, 7.3, 7.4
  - _Boundary:_ RetiredInitCommand
  - _Depends:_ none

- [x] 2.2 (P) `create-takt-sdd` を retired guidance のみに変更する
  - help と version は従来通り成功終了し、通常実行は retired guidance を返す。
  - 通常実行では install core、download、asset copy、manifest、script、package metadata の書き込み経路へ到達しないようにする。
  - guidance で `takt-sdd` 直接利用と、カスタマイズには `eject` を使うことを示す。
  - 完了時点で公開 package の bin 実行が旧 copy 動作へ戻らない。
  - _Requirements:_ 6.1, 6.2, 6.3, 6.4, 6.5, 7.3, 7.4
  - _Boundary:_ CreateTaktSddRetiredCli
  - _Depends:_ none

- [x] 2.3 (P) command catalog の表示を新しい導線へ揃える
  - top-level help で `eject` を案内し、`init` は deprecated command として扱う。
  - supported workflow catalog と retired workflow rejection は維持する。
  - package bundled runtime と retired command の説明が help 上で矛盾しないようにする。
  - 完了時点で help text から通常実行、customization、retired command の入口が区別できる。
  - _Requirements:_ 4.1, 8.2, 8.3, 8.4
  - _Boundary:_ CommandCatalog
  - _Depends:_ none

- [ ] 3. `takt-sdd eject` を明示 copy 導線として実装する
- [x] 3.1 eject の option parsing と対象 language 解決を追加する
  - `--help`、`--lang en|ja`、`--all-languages`、`--force`、`--dry-run` を扱う。
  - `--lang` と `--all-languages` の同時指定を write zero の usage error にする。
  - language option がない場合は resolved language のみを対象にする。
  - 完了時点で eject の help と option validation が file write 前に完結する。
  - _Requirements:_ 4.1, 4.2, 4.3, 4.4, 4.5
  - _Boundary:_ EjectCommand
  - _Depends:_ 1.1

- [x] 3.2 eject の copy plan と collision 判定を追加する
  - package bundled workflows/facets だけを列挙し、config、manifest、script、package metadata は plan から除外する。
  - target の missing、same content、different content を copy、skip、collision、overwrite 予定に分類する。
  - collision without force では write phase に入らない plan 結果を返す。
  - prune、空 directory cleanup、extra project files の削除を行わない。
  - 完了時点で plan だけを見れば追加、skip、collision、overwrite 予定がすべて確認できる。
  - _Requirements:_ 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.12, 7.3, 7.4, 7.5
  - _Boundary:_ EjectCommand
  - _Depends:_ 3.1

- [x] 3.3 eject の dry-run、apply、result guidance を追加する
  - dry-run は plan、no-op、collision、overwrite 予定を表示し、file を変更しない。
  - force なし collision は collision list を表示して exit 1、force ありは differing target を overwrite する。
  - success result で copied、skipped、overwritten と project-owned の注意を表示する。
  - config を作成・変更しないことを表示し、`ja` only eject では config 専用判定で manual setting guidance を出す。
  - 完了時点で dry-run と real write が同じ plan に基づき、partial write を起こさない。
  - _Requirements:_ 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12
  - _Boundary:_ EjectCommand
  - _Depends:_ 3.2

- [ ] 4. CLI dispatch を新 surface に統合する
- [x] 4.1 `takt-sdd` の top-level dispatch を runtime、retired、eject に接続する
  - `init`、`eject`、`run <workflow>`、direct workflow の分岐順を新しい command surface に揃える。
  - supported workflow 実行から installer build prerequisite を外し、package bundled runtime を直接使えるようにする。
  - retired workflow rejection と unknown command guidance は既存の挙動を維持する。
  - 完了時点で `init`、`eject`、supported workflow、retired workflow、unknown command がそれぞれ期待 exit code と message を返す。
  - _Requirements:_ 1.4, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.5, 7.3, 7.4, 7.5
  - _Boundary:_ CliMain
  - _Depends:_ 1.2, 2.1, 2.3, 3.3

- [ ] 5. 自動検証を追加・更新する
- [ ] 5.1 (P) package bundled runtime の実行前提を検証する
  - `.takt/` 不在、root override、language override、package fallback の preflight 結果を検証する。
  - config、manifest、default language の優先順位と no language fallback を検証する。
  - project-local `takt` dependency があって binary がない場合も workflow 実行を拒否しないことを検証する。
  - 完了時点で package workflow と project workflow の facet 混在を作らないことが regression test で確認できる。
  - _Requirements:_ 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.5
  - _Boundary:_ WorkflowRunner, AssetResolution
  - _Depends:_ 1.2

- [ ] 5.2 (P) retired `init` と `create-takt-sdd` の no-write を検証する
  - help と通常実行の exit code、message、旧 option validation skip を検証する。
  - temp project で `.takt`、manifest、script、package metadata が作成・変更されないことを検証する。
  - `create-takt-sdd` public CLI が install core に到達しないことを検証する。
  - 完了時点で旧 initializer が copy 動作へ戻る regression を自動検出できる。
  - _Requirements:_ 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.3, 7.4
  - _Boundary:_ RetiredInitCommand, CreateTaktSddRetiredCli
  - _Depends:_ 2.1, 2.2

- [ ] 5.3 (P) eject の plan、dry-run、write policy を検証する
  - help、language option、all-languages、mutually exclusive option を検証する。
  - missing、same content、collision、force overwrite、dry-run force を temp project で検証する。
  - config、manifest、script、package metadata が plan に入らず作成・変更されないことを検証する。
  - `ja` only eject の manual setting guidance が config 専用判定で出ることを検証する。
  - 完了時点で collision without force が write zero であることを regression test で確認できる。
  - _Requirements:_ 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 7.3, 7.4, 7.5
  - _Boundary:_ EjectCommand
  - _Depends:_ 3.3

- [ ] 5.4 package artifact と migration 文言の regression を検証する
  - package artifact に runtime source として必要な bundled workflows/facets が含まれることを検証する。
  - retired copy surface が publish artifact や bin smoke で復活しないことを検証する。
  - README と CHANGELOG に package bundled runtime、eject、retired guidance、manual script 例、breaking behavior が残ることを検証する。
  - 完了時点で migration guidance の欠落や breaking 表記の消失が自動検出できる。
  - _Requirements:_ 6.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
  - _Boundary:_ DocumentationMigration, CommandCatalog
  - _Depends:_ 2.2, 2.3

- [ ] 6. ドキュメントと migration を更新する
- [ ] 6.1 no-copy runtime と eject 移行を README / CHANGELOG に反映する
  - 通常実行が package bundled workflows/facets を直接使うことを説明する。
  - customization には `takt-sdd eject` を使い、ejected files は project-owned で自動更新されないことを説明する。
  - `takt-sdd init` と `create-takt-sdd` が retired guidance only になることを説明する。
  - npm scripts を使いたい利用者向けに `takt-sdd kiro-*` を呼ぶ手動例を示す。
  - CHANGELOG に major version を上げない BREAKING BEHAVIOR CHANGE として記録する。
  - 完了時点で英日 README と CHANGELOG から新しい通常導線と破壊的挙動変更が確認できる。
  - _Requirements:_ 3.5, 5.9, 5.10, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
  - _Boundary:_ DocumentationMigration
  - _Depends:_ 4.1

- [ ] 7. 最終統合検証を行う
- [ ] 7.1 targeted checks と package smoke を通す
  - CLI、installer、package artifact、documentation regression の targeted test scripts を実行する。
  - package bundled workflow 実行、retired command、eject dry-run、eject collision の smoke 結果を確認する。
  - 既存 `.takt/config.yaml` や未関係の project-owned files を変更していないことを確認する。
  - 完了時点で対象 test suite が green で、残る manual verification があれば明示されている。
  - _Requirements:_ 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
  - _Boundary:_ CliMain, AssetResolution, WorkflowRunner, RetiredInitCommand, EjectCommand, CreateTaktSddRetiredCli, DocumentationMigration
  - _Depends:_ 5.1, 5.2, 5.3, 5.4, 6.1
