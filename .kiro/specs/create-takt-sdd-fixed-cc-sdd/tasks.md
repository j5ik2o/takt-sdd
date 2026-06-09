# Implementation Plan

- [ ] 1. 基盤: cc-sdd メッセージ・定数・テスト導線
- [x] 1.1 (P) i18n に cc-sdd 初期化メッセージを en/ja で追加
  - `installer/src/i18n.ts` の `Messages` インターフェースに 4 フィールドを追加: 進行（initializing, version 引数）、成功（initialized）、失敗（init failed, details 引数）、dry-run 予定（dry-run plan, version + lang 引数）
  - `en` と `ja` の両 `Messages` 実装に上記 4 フィールドを既存 OpenSpec メッセージと対称な文面で実装する
  - 観測可能な完了: `getMessages("ja")` と `getMessages("en")` の双方が cc-sdd 初期化・失敗・dry-run 予定の文字列を返し、TypeScript ビルドが型エラーなく通る
  - _Requirements: 6.1, 6.2, 6.3, 4.2_
  - _Boundary:_ cc-sdd i18n メッセージ (i18n.ts)
  - _Depends:_ none

- [x] 1.2 (P) installer の test 実行導線を整備
  - `installer/package.json` の `scripts.test` に `npm run build && node --test` を追加する
  - `files` を `["dist", "!dist/**/*.test.js"]` に変更し、ビルドされたテスト成果物を publish 対象から除外する
  - 観測可能な完了: `npm test` がビルド後に `node --test` を起動でき、`files` 設定がテスト `.test.js` を publish から除外する
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Boundary:_ installer/package.json
  - _Depends:_ none

- [x] 1.3 (P) cc-sdd 固定バージョン定数と純粋な exec 引数ビルダーを追加
  - `installer/src/install.ts` に `CC_SDD_PACKAGE = "cc-sdd"` と `CC_SDD_VERSION = "3.0.2"` を既存 OpenSpec 定数付近に定義し export する（既存 `OPENSPEC_PACKAGE`/`OPENSPEC_VERSION` の値は変更しない）
  - 副作用のない `buildCcSddExecArgs(npmCliPath, lang)` を export し、`--package=${CC_SDD_PACKAGE}@${CC_SDD_VERSION}` と `--lang <lang>` を必ず含む npm exec 引数配列を返す
  - 観測可能な完了: `buildCcSddExecArgs("/npm", "ja")` が `--package=cc-sdd@3.0.2` と連続要素 `"--lang","ja"` を含み、`"en"` 指定で `"--lang","en"` を返す（version は浮動タグでない固定文字列）
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 3.1, 3.2, 3.3, 8.1, 8.2, 7.5_
  - _Boundary:_ install.ts (cc-sdd 定数, buildCcSddExecArgs)
  - _Depends:_ none

- [ ] 2. cc-sdd CLI 起動関数の実装
- [x] 2.1 cc-sdd 起動関数と失敗用エラー型を実装
  - `installer/src/install.ts` に `class CcSddInitError extends Error` と `type CommandRunner`、既定実装 `defaultCcSddRun`（`execFileSync(file, args, { cwd, encoding:"utf-8", stdio:["ignore","pipe","pipe"] })`）を追加し export する
  - `initializeCcSddProject(cwd, lang, msg, run = defaultCcSddRun)` を export 実装: 進行メッセージ表示 → `run(process.execPath, buildCcSddExecArgs(getNpmCliPath(), lang), { cwd })` → 成功時に成功メッセージ、失敗時に `formatExecError(error)` を持つ `CcSddInitError` を throw する（`process.exit` を内包しない）
  - 観測可能な完了: stderr を持つエラーを throw する fake runner を注入すると `initializeCcSddProject` が `CcSddInitError` を throw し、その `message` が `formatExecError`（stderr 優先）で整形されている
  - _Requirements: 2.2, 5.2, 8.3_
  - _Boundary:_ install.ts (initializeCcSddProject)
  - _Depends:_ 1.3

- [ ] 3. install() への cc-sdd 起動配線
- [x] 3.1 completion path への配置・dry-run preview・失敗マッピング・非回帰用 export
  - `install()` の completion path（OpenSpec init / `removeLegacyOpsxScript` の後、manifest 書き込みの前）で `initializeCcSddProject(options.cwd, options.lang, msg)` を呼び出し、`CcSddInitError` を catch して `errorExit(msg.ccSddInitFailed(error.message))` にマップ、それ以外の例外は再 throw する
  - dry-run preview block に cc-sdd 実行予定行（`msg.ccSddDryRunPlan(...)`）を 1 行追加し、early return により起動経路へ到達しない構造を維持する（OpenSpec 起動条件・既存順序・`OPENSPEC_PACKAGE/VERSION` は変更しない）
  - 非回帰テスト参照のため既存 `syncRelativeFiles` を挙動変更なしで export する
  - 観測可能な完了: 通常モードで manifest 書き込み前に cc-sdd 起動が呼ばれ、起動失敗時は非ゼロ終了して manifest 書き込み・完了表示へ進まず、dry-run では起動されず予定行のみ表示される
  - _Requirements: 2.1, 2.3, 2.4, 4.1, 4.2, 4.3, 5.1, 5.3, 7.4_
  - _Boundary:_ install.ts (install() 統合)
  - _Depends:_ 1.1, 2.1

- [ ] 4. 検証
- [x] 4.1 install.test.ts による主要挙動と非回帰の自動テスト
  - 新規 `installer/src/install.test.ts` を `node:test` + `node:assert/strict` で作成し、(a) 固定 version `cc-sdd@3.0.2`、(b) `--lang ja`/`en` 伝播、(c) 失敗時 `CcSddInitError`、(d) dry-run 予定文字列が runner を起動しない純粋性を assert する
  - tmp ディレクトリ上で `syncRelativeFiles` を実行し、未存在→追加・hash 記録 / tracked 未改変→上書き / tracked 改変→skip / 未追跡→skip の manifest・update 非回帰を assert する
  - 観測可能な完了: `npm test` がビルド後に `node --test` を実行し、固定 version・lang 伝播・失敗停止・dry-run 非起動・manifest 非回帰の各テストが pass する
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 7.1, 7.2, 7.3_
  - _Boundary:_ install.test.ts (Test)
  - _Depends:_ 1.2, 1.3, 2.1, 3.1

- [x] 4.2 install 挙動ドキュメントの最小更新
  - `README.md` と `README.ja.md` の install behavior 説明に「install 時に固定バージョンの cc-sdd 初期化が含まれ、`--lang` が伝播する」旨を必要最小限で追記する
  - `COMMON.md` の installer 記述に cc-sdd 初期化を含む旨を必要最小限で追記する
  - 観測可能な完了: 3 ファイルが cc-sdd 初期化の install への追加を記述し、既存記述の不要な改変を伴わない
  - _Requirements: 9.1, 9.2, 9.3_
  - _Boundary:_ README.md, README.ja.md, COMMON.md
  - _Depends:_ 3.1
