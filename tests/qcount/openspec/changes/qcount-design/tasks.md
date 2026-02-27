# Tasks: qcount-design

## Task List

### フェーズ1: プロジェクト基盤

- [x] Task 1: `Cargo.toml`に依存クレートを追加する
  - `ignore`, `rayon`, `clap`(derive feature), `serde`+`serde_json`, `tabled`, `anyhow`
  - 受入条件: `cargo check`が通る

- [x] Task 2: `cli.rs`を実装する
  - `clap` v4 derive で`Args`構造体を定義（`path`, `--json`, `--by-dir`, `--exclude`）
  - 受入条件: `qcount --help`でヘルプが表示される

### フェーズ2: コアロジック（データ駆動設計の核）

- [x] Task 3: `language.rs`を実装する
  - `Language` enum（12言語）を定義
  - `LanguageDef`構造体（拡張子・行コメント記号・ブロックコメント記号）を定義
  - 拡張子から`Language`へのマッピング関数を実装
  - 受入条件: `.rs`→`Rust`、`.py`→`Python`等のマッピングが正しい（ユニットテスト）

- [x] Task 4: `counter.rs`を実装する
  - `FileStats`構造体を定義（`path`, `language`, `total_lines`, `code_lines`, `blank_lines`, `comment_lines`）
  - 簡易ステートマシン（Normal / InBlockComment）による行カウントを実装
  - 受入条件: 各言語のコメント・空行・コード行を正しく識別するユニットテスト

### フェーズ3: 走査・集計

- [x] Task 5: `walker.rs`を実装する
  - `ignore::Walk`でファイルを`Vec<DirEntry>`に収集
  - .gitignore・カスタム除外パターンを考慮
  - 受入条件: .gitignore記載ファイルが除外される

- [x] Task 6: `aggregator.rs`を実装する
  - `LangSummary`・`DirSummary`・`Report`構造体を定義
  - `Vec<FileStats>`を言語別・ディレクトリ別に集計する関数を実装
  - `--by-dir=false`時は言語別サマリーのみ、`true`時はディレクトリ別も含む
  - 0件ディレクトリはスキップ
  - 受入条件: 既知のFileStatsセットから期待するLangSummaryが得られる（ユニットテスト）

### フェーズ4: 出力

- [x] Task 7: `reporter/mod.rs`で`Reporter` traitを定義する
  - `fn report(&self, report: &Report) -> anyhow::Result<()>`

- [x] Task 8: `reporter/table.rs`で`TableReporter`を実装する
  - `tabled`クレートで言語別サマリーをASCIIテーブル表示
  - `--by-dir`指定時はディレクトリ別テーブルも表示
  - 受入条件: テーブルが正しい列（Language, Files, Total, Code, Blank, Comment）で出力される

- [x] Task 9: `reporter/json.rs`で`JsonReporter`を実装する
  - `serde_json`でReport構造体をJSON出力
  - 受入条件: `--json`フラグ指定時にJSON形式で出力される

### フェーズ5: 統合

- [x] Task 10: `main.rs`でパイプライン全体を接続する
  - `Args`解析 → `walker::walk()` → `rayon::par_iter()`で`counter::count()` → `aggregator::aggregate()` → `Reporter::report()`
  - `anyhow`でエラーを集約
  - 受入条件: `qcount .`でカレントディレクトリの行数統計が出力される

### フェーズ6: テスト

- [x] Task 11: `tests/integration/fixtures/`にテスト用ファイルを配置する
  - 既知行数（コード行・コメント行・空白行が明確）のRust・Python・JavaScriptファイルを配置
  - 受入条件: フィクスチャファイルの行数が手動確認済み

- [x] Task 12: `tests/integration/count_test.rs`を実装する
  - フィクスチャディレクトリに対して`qcount`を実行し、期待値と照合
  - 受入条件: `cargo test`で統合テストが全件パス
