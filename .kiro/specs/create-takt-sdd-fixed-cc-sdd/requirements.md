# Requirements Document

## Project Description (Input)

create-takt-sdd installer が、内部で固定バージョンの cc-sdd CLI（Kiro-compatible 初期化）を起動できるようにする。現状 create-takt-sdd は TAKT 資産と OpenSpec 初期化はまとめて導入できるが、cc-sdd 側の Kiro-compatible 初期化を固定バージョンで内部起動していないため、利用者は別途 `npx cc-sdd@...` を実行する必要があり、バージョン差分に依存しやすい。

本 spec では、OpenSpec 初期化と同じ installer-local CLI 起動パターンを採用し、`installer/src/install.ts` に固定 `CC_SDD_PACKAGE` / `CC_SDD_VERSION` を追加して `npx cc-sdd@<CC_SDD_VERSION> --lang <lang>` 相当の内部起動を実装する。`--lang` は create-takt-sdd の `options.lang` と同一値を渡し、dry-run では実行せず予定だけを表示する。失敗時は OpenSpec 初期化失敗と同等に明示的な installer error として停止する。既存の TAKT asset manifest、customized file skip、update 上書き判定、OpenSpec 初期化条件は維持する。

### Scope (from brief)

- **In**: `installer/src/install.ts` の固定 cc-sdd package/version 定数、cc-sdd 内部起動、`--lang` 伝播、失敗時 error handling、dry-run preview、`installer/src/i18n.ts` の en/ja メッセージ、installer build/test で確認できる deterministic test または smoke、必要最小限の README/README.ja/COMMON 更新
- **Out**: cc-sdd 側のコードや package 変更、TAKT asset manifest/update policy の設計変更、OpenSpec package/version policy の変更、`.coderabbit.yml` / `.coderabbit.yaml` の変更、既存 TAKT workflow/facet の不要な改修

### Constraints (from brief)

- cc-sdd 側のコードや package は変更しない。
- cc-sdd version は `latest` その他の浮動タグではなく、installer source 内で具体的なバージョン文字列として固定する。
- `--lang` は create-takt-sdd と内部 cc-sdd 呼び出しで同一値を使う。
- テストでは少なくとも、固定 version 使用・`--lang ja` 伝播・失敗時 error・dry-run 非実行・既存 manifest/update policy の非回帰を確認する。

> 詳細な背景・現状・アプローチ・境界は `brief.md` を参照。

## Requirements

### Requirement 1: 固定バージョン定数による cc-sdd CLI の特定

**Objective:** メンテナーとして、cc-sdd の package と version を installer source 内で固定したい。これは利用者ごと・実行ごとのバージョン差分を排除するためである。

#### Acceptance Criteria

1. `installer/src/install.ts` は常に固定された `CC_SDD_PACKAGE` 定数を保持しなければならない。
2. `installer/src/install.ts` は常に固定された `CC_SDD_VERSION` 定数を保持しなければならない。
3. システムは常に cc-sdd CLI の特定に `CC_SDD_PACKAGE` と `CC_SDD_VERSION` を用い、これらをハードコードされた別の値で代替してはならない。

### Requirement 2: install 完了パスでの cc-sdd CLI 内部起動

**Objective:** create-takt-sdd 利用者として、別途 `npx cc-sdd@...` を手動実行せずに cc-sdd の Kiro 互換初期化を受け取りたい。これは期待されるセットアップを 1 回の install で確実に揃えるためである。

#### Acceptance Criteria

1. install が dry-run でない通常モードで実行されたとき、システムは `npx cc-sdd@<CC_SDD_VERSION> --lang <lang>` 相当の cc-sdd CLI を内部起動しなければならない。
2. システムは常に cc-sdd CLI を `process.execPath` と npm CLI 経由（既存 OpenSpec 初期化と同じ installer-local 起動パターン）で起動しなければならない。
3. システムは cc-sdd CLI 起動を既存 OpenSpec 初期化と同じ install completion path（manifest 書き込み前の install 完了フェーズ）に配置しなければならない。
4. システムは cc-sdd CLI 起動が TAKT asset 同期および package.json 更新の結果を破壊しないように、それらの完了後に cc-sdd CLI を起動しなければならない。

### Requirement 3: `--lang` 値の伝播

**Objective:** create-takt-sdd 利用者として、cc-sdd の初期化が create-takt-sdd と同じ言語で行われてほしい。これは言語が一貫したワークスペースを得るためである。

#### Acceptance Criteria

1. cc-sdd CLI を内部起動するとき、システムは create-takt-sdd の `options.lang` と同一の値を cc-sdd 呼び出しの `--lang` 引数として渡さなければならない。
2. `options.lang` が `ja` ならば、システムは cc-sdd CLI を `--lang ja` で起動しなければならない。
3. `options.lang` が `en` ならば、システムは cc-sdd CLI を `--lang en` で起動しなければならない。

### Requirement 4: dry-run での非実行プレビュー

**Objective:** create-takt-sdd 利用者として、dry-run では実際の副作用なしに何が起こるか確認したい。これは安全に変更内容を予見するためである。

#### Acceptance Criteria

1. install が dry-run モードで実行された場合、システムは cc-sdd CLI プロセスを起動してはならない。
2. install が dry-run モードで実行されたとき、システムは cc-sdd CLI の実行予定を、既存 OpenSpec preview と同じ粒度でプレビュー表示しなければならない。
3. install が dry-run モードで実行された場合、システムは cc-sdd 初期化に起因するファイル書き込みを行ってはならない。

### Requirement 5: cc-sdd 起動失敗時の明示的エラー停止

**Objective:** create-takt-sdd 利用者として、cc-sdd 初期化が失敗したときに静かに不完全なまま進むのではなく、明示的に停止してほしい。これは不完全なセットアップを検知可能にするためである。

#### Acceptance Criteria

1. cc-sdd CLI の内部起動が失敗した場合、システムは OpenSpec 初期化失敗と同等の明示的な installer error として install を停止しなければならない。
2. cc-sdd CLI の内部起動が失敗した場合、システムは `formatExecError()` を用いて stderr/stdout/message を整形したエラー詳細を提示しなければならない。
3. cc-sdd CLI の内部起動が失敗した場合、システムは非ゼロ終了で停止し、後続の manifest 書き込みおよび完了表示へ進んではならない。

### Requirement 6: en/ja の cc-sdd 初期化メッセージ

**Objective:** create-takt-sdd 利用者として、cc-sdd 初期化の進行・失敗メッセージを選択した言語で読みたい。これは既存メッセージと一貫した体験を得るためである。

#### Acceptance Criteria

1. `installer/src/i18n.ts` は常に cc-sdd 初期化の進行（initializing）メッセージを en と ja の両方で保持しなければならない。
2. `installer/src/i18n.ts` は常に cc-sdd 初期化の失敗（init failed）メッセージを en と ja の両方で保持しなければならない。
3. cc-sdd 初期化メッセージを表示するとき、システムは create-takt-sdd の `options.lang` に対応する言語のメッセージを使用しなければならない。

### Requirement 7: 既存 install 挙動の非回帰

**Objective:** メンテナーとして、cc-sdd 起動の追加によって既存の install 挙動が変わらないことを保証したい。これはスコープ外の機能を壊さないためである。

#### Acceptance Criteria

1. システムは常に既存の TAKT asset manifest（`.takt/.manifest.json` の file hash 記録）の挙動を維持しなければならない。
2. システムは常に customized file skip の判定（未追跡または改変済みファイルを上書きしない）を維持しなければならない。
3. システムは常に update 時の上書き判定（manifest 追跡済みかつ未カスタマイズのファイルのみ上書き）を維持しなければならない。
4. システムは常に既存 OpenSpec 初期化の起動条件（`usesOfficialOpenSpec` かつ config 未存在時のみ初期化）を維持しなければならない。
5. システムは常に `OPENSPEC_PACKAGE` と `OPENSPEC_VERSION` の値を変更せずに維持しなければならない。

### Requirement 8: 検証可能なテストによる確認

**Objective:** メンテナーとして、cc-sdd 起動の主要な振る舞いを installer build/test で検証したい。これは回帰を自動で検知するためである。

#### Acceptance Criteria

1. システムは cc-sdd CLI が固定 `CC_SDD_VERSION` を用いて起動されることを確認するテストを保持しなければならない。
2. システムは `--lang ja` が cc-sdd 呼び出しへ伝播することを確認するテストを保持しなければならない。
3. システムは cc-sdd 起動失敗時に明示的 error で停止することを確認するテストを保持しなければならない。
4. システムは dry-run モードで cc-sdd CLI が起動されないことを確認するテストを保持しなければならない。
5. システムは既存 manifest/update policy が cc-sdd 起動追加後も非回帰であることを確認するテストを保持しなければならない。

### Requirement 9: ドキュメントの最小更新

**Objective:** create-takt-sdd 利用者として、cc-sdd 初期化が install に含まれることをドキュメントから把握したい。これは新しい install 挙動を理解するためである。

#### Acceptance Criteria

1. install フローに cc-sdd 初期化が追加された場合、システムは `README.md` の install behavior 説明を必要最小限の範囲で更新しなければならない。
2. install フローに cc-sdd 初期化が追加された場合、システムは `README.ja.md` の install behavior 説明を必要最小限の範囲で更新しなければならない。
3. install フローに cc-sdd 初期化が追加された場合、システムは `COMMON.md` を必要に応じて必要最小限の範囲で更新しなければならない。

### Out of Scope

以下は本 spec の対象外とし、変更してはならない。

- cc-sdd CLI 自体のコード・package・依存・バグ修正・仕様変更。
- TAKT asset install の manifest schema 変更。
- `OPENSPEC_PACKAGE` / `OPENSPEC_VERSION` の値変更。
- `kiro:*` workflow surface や `.kiro/specs/*` lifecycle の再設計。
- `.coderabbit.yml` / `.coderabbit.yaml` の変更。
- 既存 TAKT workflow / facet の不要な改修。
