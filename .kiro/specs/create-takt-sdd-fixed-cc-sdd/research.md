# Research & Design Decisions — create-takt-sdd-fixed-cc-sdd

## Summary

- **Feature**: `create-takt-sdd-fixed-cc-sdd`
- **Discovery Scope**: Extension（既存 installer への統合中心の追加）
- **Key Findings**:
  - 既存 `installer/src/install.ts` の `initializeOpenSpecProject()` が、固定バージョン CLI を `process.execPath` + npm CLI（`getNpmCliPath()`）経由で起動し、失敗時 `formatExecError()` → `errorExit()` で明示停止する確立済みパターンを持つ。cc-sdd 起動はこれを踏襲できる。
  - cc-sdd は npm package `cc-sdd`（bin `cc-sdd`）で、`npx cc-sdd@<version> --lang <lang>` 形式で起動できる。subcommand 不要、`--lang` は en/ja を含む多言語対応。npm registry 上の latest は `3.0.2`（2026-06-09 時点で確認）。
  - installer には現状テストランナーが存在しない（`installer/package.json` の scripts は `build` / `prepare` のみ、`*.test.ts` も無し）。Requirement 8 の検証可能テストを満たすには、テスト戦略そのものを設計判断として確定する必要がある。

## Research Log

### 既存 OpenSpec 初期化パターンの調査
- **Context**: cc-sdd 内部起動を「OpenSpec 初期化と同じ installer-local 起動パターン」で実装する要求（Req 2.2）。再利用可能な既存資産を確定する必要がある。
- **Sources Consulted**: `installer/src/install.ts`（`initializeOpenSpecProject` L335-366, `getNpmCliPath` L315-317, `getOpenSpecCliPath` L310-313, `formatExecError` L319-333, `errorExit` L123-126, install completion path L629-643）, `installer/src/i18n.ts`（`openspecInitializing` / `openspecInitialized` / `openspecInitFailed`）。
- **Findings**:
  - OpenSpec init は 2 経路を持つ: 同梱バージョン一致時は `getOpenSpecCliPath()`（`require.resolve`）、不一致時は `npm exec --yes --package=...@<ver> -- openspec init ...`。いずれも `execFileSync(process.execPath, args, { cwd, encoding, stdio:["ignore","pipe","pipe"] })`。
  - 失敗時は `errorExit(msg.openspecInitFailed(formatExecError(error)))` で stderr/stdout/message を整形し非ゼロ終了。
  - 呼び出しは completion path、package.json 更新後・manifest 書き込み付近に配置できる。OpenSpec と同じ外部 CLI 起動パターンを踏襲しつつ、TAKT asset manifest は cc-sdd 前に確定させる。
  - dry-run は早期 return（L503）前の preview block（L474-504）で `console.log(msg.dryRunItem(OPENSPEC_CONFIG_PATH))` を 1 行表示し、実プロセスは起動しない。
- **Implications**:
  - cc-sdd は同梱依存ではない（`installer/package.json` の dependencies は `@fission-ai/openspec` のみ）ため、cc-sdd 起動は OpenSpec の「npm exec 経路」のみを採用すればよく、二経路分岐は不要。
  - `getNpmCliPath()` / `formatExecError()` / `errorExit()` / dry-run preview block / completion path 配置をそのまま流用できる。

### cc-sdd CLI 起動契約の確認
- **Context**: `--lang` 伝播（Req 3）と起動引数（Req 2.1）を正確に決めるため、cc-sdd の実 CLI 仕様を確認。
- **Sources Consulted**: npm registry `https://registry.npmjs.org/cc-sdd/latest`（version `3.0.2`, bin `cc-sdd`）、`https://raw.githubusercontent.com/gotalab/cc-sdd/main/README.md`。
- **Findings**:
  - `npx cc-sdd@latest --lang ja` 形式が公式 usage。subcommand 不要、デフォルト agent は Claude Code。`--lang` は en/ja 等をサポート。`--dry-run` 等のフラグも存在。
  - requirements が規定する内部起動は `npx cc-sdd@<CC_SDD_VERSION> --lang <lang>` 相当（agent フラグ無し）。
- **Implications**:
  - npm exec 引数は `[getNpmCliPath(), "exec", "--yes", "--package=cc-sdd@3.0.2", "--", "cc-sdd", "--lang", <lang>]`。
  - **Risk（follow-up）**: cc-sdd が対話プロンプト（上書き確認等）を出すと非対話実行で停止し得る。requirements は `--lang` のみを規定するため設計は忠実に従うが、実装時の smoke で非対話完了を確認する（Risks 参照）。

### installer のテスト基盤調査
- **Context**: Req 8 は固定 version 使用・`--lang ja` 伝播・失敗時 error・dry-run 非実行・既存 manifest/update policy 非回帰の検証可能テストを要求。
- **Sources Consulted**: `installer/package.json`（scripts: build/prepare のみ）, `installer/tsconfig.json`（`include:["src"]`, `outDir:dist`, `rootDir:src`, module Node16）, `installer/scripts/add-shebang.js`, リポジトリ全体の `*.test.ts` 検索（installer/src には存在せず）。
- **Findings**:
  - 既存テストランナー・テストフレームワーク無し。
  - Node engines は `>=20.19.0`（`installer/package.json`）。Node 20.19 では `node:test` / `node:assert` 組み込みテストランナーが安定利用可能。
  - `install()` は network download（archive 取得）と外部プロセス起動を含むため、関数全体の end-to-end deterministic テストは不向き。テスト容易性のための seam（依存注入・純粋関数抽出）が必要。
- **Implications**:
  - 新規依存を増やさず `node:test` を採用する（Decision 参照）。
  - cc-sdd 起動ロジックを「純粋な引数ビルダー」と「runner 注入可能な init 関数」に分割し、deterministic にテスト可能にする。
  - 非回帰（Req 7/8.5）は既存 `syncRelativeFiles()` の customized-skip / tracked-overwrite 判定を tmp ディレクトリ上で offline 検証する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. OpenSpec パターン踏襲・install.ts 内に init 関数追加（直接 errorExit） | `initializeOpenSpecProject` と同構造の `initializeCcSddProject` を install.ts に追加 | 既存と完全一致で読みやすい | 失敗時 `errorExit`→`process.exit` を内包し、失敗パスの unit test が困難 | dry-run/配置は OpenSpec と同じ |
| B. パターン踏襲＋テスト容易化（純粋引数ビルダー＋runner 注入＋throw、install() 側で errorExit）【採用】 | 引数生成を純粋関数化し、init は runner を注入可能・失敗時 throw、install() で errorExit へマップ | 5 つの検証項目を offline で deterministic にテスト可能、ユーザー挙動は A と同一 | install.ts に export と薄い wrapper が増える | OpenSpec の挙動契約は維持 |
| C. cc-sdd 専用モジュール新設（installer/src/cc-sdd.ts） | init/ビルダー/定数を別モジュールへ分離 | 凝集度高 | `info/errorExit/formatExecError/getNpmCliPath` を install.ts と共有するため依存配線が増え、surgical でない | 現規模では過剰分割 |

## Design Decisions

### Decision: cc-sdd 起動は npm exec 単一経路で実装する
- **Context**: OpenSpec は同梱バージョン一致時に bundled CLI、それ以外で npm exec の二経路。cc-sdd の起動経路を決める必要がある。
- **Alternatives Considered**:
  1. 二経路（bundled + npm exec）を踏襲 — cc-sdd を installer の dependency に追加して `require.resolve` で同梱起動も用意。
  2. npm exec 単一経路 — `npm exec --yes --package=cc-sdd@<ver>` のみ。
- **Selected Approach**: 案 2。`[getNpmCliPath(), "exec", "--yes", "--package=cc-sdd@<CC_SDD_VERSION>", "--", "cc-sdd", "--lang", <lang>]` を `execFileSync(process.execPath, ...)` で起動。
- **Rationale**: cc-sdd 側 package を変更せず（Out of Scope）、installer に新規 runtime dependency を増やさないため。requirements の `npx cc-sdd@<CC_SDD_VERSION>` 表現とも一致。
- **Trade-offs**: 毎回 npm exec でダウンロード解決が走る（OpenSpec の bundled 高速経路は得られない）が、固定バージョン指定で再現性は確保される。
- **Follow-up**: smoke で `--lang ja` 実起動が固定バージョンを解決することを確認。

### Decision: テストランナーは組み込み `node:test` を採用し、cc-sdd 起動ロジックを seam 化する
- **Context**: installer にテスト基盤が無く、Req 8 の 5 項目を検証可能にする必要がある。`install()` は network/process を含み全体テストが難しい。
- **Alternatives Considered**:
  1. vitest/jest 等を devDependency 追加 — 高機能だが新規依存・設定コスト。
  2. `node:test` + `node:assert/strict`（新規依存なし）。
  3. テストせず smoke のみ — Req 8 の deterministic 検証を満たしにくい。
- **Selected Approach**: 案 2。`installer/src/install.test.ts` を追加し、(a) 純粋関数 `buildCcSddExecArgs()`、(b) runner 注入可能な `initializeCcSddProject()`（失敗時 throw）、(c) 既存 `syncRelativeFiles()` を tmp ディレクトリで検証する unit tests を実装。`installer/package.json` に `"test": "npm run build && node --test"` を追加。
- **Rationale**: 新規依存ゼロ、Node 20.19 engines で安定動作。seam 化により 8.1〜8.5 を offline・deterministic に検証できる。
- **Trade-offs**: install.ts に export と薄い wrapper（errorExit へのマッピング）が増える。tsc が test を dist へ出力するため publish 対象から除外設定が必要。
- **Follow-up**: `installer/package.json` の `files` に test 成果物の除外（`"!dist/**/*.test.js"`）を追加。

### Decision: 失敗時は init 関数が `CcSddInitError` を throw し、install() が errorExit へマップする
- **Context**: Req 5 は OpenSpec 初期化失敗と同等の明示停止（formatExecError 整形・非ゼロ終了・完了表示へ進まない）を要求。同時に Req 8.3 で失敗パスを deterministic にテストしたい。
- **Alternatives Considered**:
  1. OpenSpec と同じく init 内で直接 `errorExit`（process.exit）。
  2. init は `formatExecError()` で整形したメッセージを持つ `CcSddInitError` を throw、install() が `errorExit(msg.ccSddInitFailed(err.message))`。
- **Selected Approach**: 案 2。
- **Rationale**: ユーザー観測挙動（整形メッセージ・非ゼロ終了・完了表示未到達）は案 1 と同一でありながら、失敗パスを `process.exit` 無しに unit test できる。TAKT asset manifest は外部 cc-sdd 起動前に確定し、失敗後の retry が update path に進める状態を維持する。
- **Trade-offs**: OpenSpec init と微妙に構造が異なる（errorExit の位置が呼び出し側）。設計上の差分として明記。
- **Follow-up**: install() の wrapper が `CcSddInitError` のみ握り、それ以外は再 throw することをレビューで確認。

### Decision: dry-run プレビューは preview block 内で 1 行表示し、起動経路へ到達させない
- **Context**: Req 4 は dry-run で cc-sdd を起動せず、OpenSpec preview と同粒度で実行予定を表示すること。
- **Selected Approach**: 既存 dry-run block（早期 return 前）に `console.log(msg.ccSddDryRunPlan(CC_SDD_VERSION, options.lang))` を 1 行追加。実起動呼び出しは completion path（早期 return 後）にのみ置くため、dry-run では構造的に到達しない。
- **Rationale**: 早期 return による「到達不能」保証が最も確実。OpenSpec の単一 preview 行と同粒度。
- **Trade-offs**: プレビュー内容は「生成パス」ではなく「実行予定コマンド」表現（cc-sdd は生成物パスが単一に定まらないため）。粒度（1 行）は OpenSpec と同等。

## Risks & Mitigations
- cc-sdd CLI が対話プロンプトを出し非対話実行で停止する — smoke（isolated tmp dir の `--lang ja`）で非対話完了を確認。停止する場合は requirements に戻り起動フラグを再協議（design.md では勝手にフラグを追加しない）。
- `node --test` が dist の test を発見せず CI で未実行になる — `npm run build` 後に `node --test`（既定で `**/*.test.js` を探索）で dist/install.test.js を確実に実行。必要なら明示パスを渡す。
- test 成果物が npm publish に混入 — `installer/package.json` の `files` に `"!dist/**/*.test.js"` を追加して除外。
- cc-sdd 固定バージョン `3.0.2` の陳腐化 — installer source 内の単一定数 `CC_SDD_VERSION` に集約し、更新時の変更箇所を 1 点に限定。

## References
- npm registry `cc-sdd@latest` — version `3.0.2`, bin `cc-sdd`（固定バージョン根拠）。
- gotalab/cc-sdd README — `npx cc-sdd@latest --lang ja` usage（起動契約根拠）。
- `installer/src/install.ts` — OpenSpec 初期化・completion path・dry-run・manifest パターンの正本。
- `installer/src/i18n.ts` — en/ja メッセージ構造の正本。
- Node.js `node:test` — 組み込みテストランナー（Node >=20.19 engines で利用可）。
