# 調査・設計判断

## 要約
- **機能**: `no-copy-bundled-assets-eject`
- **ディスカバリー範囲**: 拡張。既存 `takt-sdd` CLI、workflow runner、`create-takt-sdd` installer の統合点に絞った light discovery。
- **主要な発見**:
  - 既存 `cli/workflow-runner.mjs` は project-local `.takt/` を前提に workflow を解決しており、package bundled workflow fallback がない。
  - 既存 `init` と `create-takt-sdd` は installer core のコピー、manifest、package.json script merge に依存しているため、廃止案内だけの command path へ切り離す必要がある。
  - language 解決は既に `.takt/config.yaml` の `language`、manifest `lang`、`en` default の順に近い形で存在するため、実行時と eject で共有できる read-only resolver に寄せる。

## 調査ログ

### CLI command routing
- **背景**: `takt-sdd init` は残すが、help 以外は書き込みを行わず retired guidance にする。`eject` は新しい明示 command として追加する。
- **参照した情報源**:
  - `cli/main.mjs`
  - `cli/command-catalog.mjs`
  - `cli/init-adapter.mjs`
- **発見**:
  - `cli/main.mjs` は global options を処理した後、`init` を先に分岐し、`run` 正規化、retired workflow rejection、catalog workflow 実行へ進む。
  - `init` と supported workflow の前に `checkInstallerBuilt()` が呼ばれ、installer build の存在に依存している。
  - `buildHelpText()` は `init` を通常の初期化 command として案内しており、`eject` がまだ command catalog に存在しない。
- **含意**:
  - `init` retired guidance と `eject` は workflow catalog とは別の top-level command として `main` で先に分岐する。
  - retired `init` は installer core を import しないため、help 以外も `checkInstallerBuilt()` を不要にする。
  - command catalog は `init` の説明を deprecated に変更し、`eject` の usage を追加する。

### Runtime workflow and facet resolution
- **背景**: 通常実行を package bundled assets 直接利用へ切り替え、project-local workflow は明示 override として維持する。
- **参照した情報源**:
  - `cli/workflow-runner.mjs`
  - `.takt/en/workflows/*.yaml`
  - `.takt/ja/workflows/*.yaml`
- **発見**:
  - `resolveWorkflowPathStrict()` は project root の `.takt/workflows/<name>.yaml`、`.takt/<lang>/workflows/<name>.yaml` だけを候補にする。
  - `runWorkflow()` は選択 workflow path を `takt` に `-w` で渡すため、facet は workflow file の相対参照として TAKT 側で解決される。
  - `resolveTaktBin(packageRoot)` は既に packageRoot 側の `takt` dependency を解決している。
- **含意**:
  - workflow resolver に package `.takt/<lang>/workflows/<name>.yaml` を第三候補として追加すれば、package workflow は package facets を相対参照する。
  - project workflow が選ばれた場合は project workflow file からの相対参照だけを使うため、package facets への暗黙 fallback は実装しない。
  - project-local `takt` binary の存在確認は package 実行モデルと矛盾するため preflight から除去する。

### Eject copy planning
- **背景**: カスタマイズが必要な利用者だけが workflows/facets を project-owned files として取り出す。
- **参照した情報源**:
  - `installer/src/install.ts`
  - `tests/takt-sdd-init-policy.test.mjs`
- **発見**:
  - installer core には recursive file collection、hash 比較、force overwrite の既存知見があるが、manifest と package.json merge を前提にしている。
  - `eject` は `.takt/<lang>/workflows/**/*` と `.takt/<lang>/facets/**/*` だけを扱い、manifest、config、script、package.json は対象外。
  - collision 発見時に partial write を避けるには、全ファイルの plan を先に作り、write phase は collision policy 判定後にだけ実行する必要がある。
- **含意**:
  - `cli/eject-command.mjs` に plan/apply を閉じ込め、installer core とは共有しない。
  - hashing は Node.js 標準 `crypto.createHash("sha256")` と `fs` で実装し、新規依存は追加しない。
  - dry-run と real write は同じ plan を使い、出力だけを分ける。

### create-takt-sdd retirement
- **背景**: `create-takt-sdd` は `takt-sdd eject` があれば新規導線として不要になる。
- **参照した情報源**:
  - `installer/src/cli.ts`
  - `installer/src/i18n.ts`
  - `installer/src/install.ts`
- **発見**:
  - `installer/src/cli.ts` は引数解析後に `install()` を呼び、download、copy、manifest、package.json merge へ進む。
  - help text は `i18n.ts` にあり、通常実行と help で同じ message set を参照している。
  - `install.ts` には既存テストが多く残るが、新しい public behavior では CLI から到達しない。
- **含意**:
  - public CLI path は `installer/src/cli.ts` で retired help/guidance を完結させ、通常実行では `install()` を呼ばない。
  - 既存 `install.ts` は immediate deletion せず、公開 CLI から到達不能であることをテストで固定する方が変更範囲を抑えられる。

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク／制約 | メモ |
|--------|------|------|--------------|------|
| 既存 installer core を eject に流用 | `installFromSource()` の copy/hash logic を `eject` から呼ぶ | 既存ロジックの再利用 | manifest、package.json、script copy、retired cleanup が混ざりやすい | 不採用。責務境界が現在の要件と逆向き。 |
| CLI local planner | `cli/eject-command.mjs` が package assets を列挙し、plan/apply を持つ | 対象ファイルを限定しやすく partial write を避けやすい | copy logic が installer と別になる | 採用。copy 対象と policy が異なるため意図が分かれる。 |
| workflow runner 内に解決を直書き | `workflow-runner.mjs` の内部関数を拡張する | 変更ファイルが少ない | `eject` と language resolution を共有しづらい | 一部不採用。shared resolver を切り出す。 |
| shared asset resolver | language と workflow candidate を `cli/asset-resolution.mjs` に集約 | runtime と eject の判断を揃えられる | 小さい新規 module が増える | 採用。実装対象が明確でテストしやすい。 |

## 設計判断

### 判断: runtime asset resolution を shared resolver に集約する
- **背景**: runtime と eject はどちらも language を解決するが、workflow fallback と copy 対象は異なる。
- **検討した代替案**:
  1. `workflow-runner.mjs` にすべて残す — 変更は小さいが `eject` が同じ language policy を再実装する。
  2. `init-adapter.mjs` の `resolveLanguagePreference()` を流用する — retired init と通常実行の責務が混ざる。
  3. `cli/asset-resolution.mjs` に read-only language と workflow candidate を集約する。
- **採用したアプローチ**: `asset-resolution` を導入し、language resolution、workflow candidates、package asset root の契約を持たせる。
- **根拠**: `init` 廃止後も language policy は runtime と eject の中核に残るため、retired init adapter から独立させる。
- **トレードオフ**: 小さい module は増えるが、preflight と eject の重複を避けられる。
- **フォローアップ**: config parse は既存互換の `language: en|ja` 行だけを読む。manifest は read-only fallback のみ。

### 判断: eject は manifest ではなく copy plan で安全性を担保する
- **背景**: manifest 更新を続けると、コピー不要モデルでも asset 同期の責務が残る。
- **検討した代替案**:
  1. manifest に ejected files を記録する — update や prune の期待を生む。
  2. git diff 前提で上書きする — CLI 単体の安全性が不足する。
  3. source/target hash から plan を作り、collision があれば write phase に入らない。
- **採用したアプローチ**: missing、same、collision、overwrite planned を plan に分類し、`--force` なしの collision では何も書かず exit 1。
- **根拠**: project-owned files を壊さず、manifest を新規作成しない要件に合う。
- **トレードオフ**: 旧 ejected files の自動 prune は行わない。削除は利用者の明示作業になる。
- **フォローアップ**: dry-run と real write が同じ plan を使うことをテストで固定する。

### 判断: retired init/create は旧オプション検証より案内を優先する
- **背景**: 古い利用者は `--force` や target dir を付けて実行する可能性が高い。そこで旧 validation error を出すと移行先が伝わらない。
- **検討した代替案**:
  1. 旧 parser を通してから retired error を出す — invalid old options で案内に到達しない。
  2. help 以外は args を解釈せず retired guidance を出す。
- **採用したアプローチ**: help/version などの global surface だけ扱い、通常実行は args を検証しない retired guidance にする。
- **根拠**: 目的は安全な移行案内であり、旧 init semantics の保守ではない。
- **トレードオフ**: 旧 CLI の細かい validation は失われるが、廃止済み command として一貫する。
- **フォローアップ**: help は exit 0、通常実行は exit 1、書き込みゼロをテストする。

## リスクと緩和策
- package workflow が project facets を暗黙利用すると version mismatch が再発する — selected workflow path の相対参照だけに任せ、facet fallback を実装しない。
- `eject --force` が大量上書きを行う — dry-run と collision list を同じ plan で出力し、`--force` なしでは write phase に入らない。
- `create-takt-sdd` の公開 package が旧 copy 動作に戻る — CLI test で `install()` 非呼び出しと no-write を固定する。
- README/CHANGELOG が major version なしの破壊的挙動変更を曖昧にする — BREAKING BEHAVIOR CHANGE を明記するテキスト検査を追加する。

## 参考資料
- `cli/main.mjs` — top-level command dispatch と global option handling。
- `cli/workflow-runner.mjs` — preflight、workflow path 解決、packageRoot `takt` 実行。
- `cli/command-catalog.mjs` — public command surface と help text。
- `cli/init-adapter.mjs` — 既存 init parser と language resolution。
- `installer/src/cli.ts` — `create-takt-sdd` public CLI entry。
- `installer/src/install.ts` — 既存 copy/hash/manifest/package.json merge の制約。
- `.kiro/steering/product.md`、`.kiro/steering/tech.md`、`.kiro/steering/structure.md` — product surface、Node.js/TAKT 技術方針、配置方針。
