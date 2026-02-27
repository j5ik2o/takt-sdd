# Design: qcount-design

## Overview

`qcount`はRustで実装する高速ファイル行数カウントCLIツール。
ファイル単位の並列処理パイプラインを核とし、.gitignoreやglobパターンを考慮した上でソースファイルを走査・集計・出力する。

アーキテクチャ全体像:

```
Walk（ignore クレート）
  → collect Vec<DirEntry>
  → rayon::par_iter() でファイル単位並列処理
  → Vec<FileStats> に集計
  → Reporter（テーブル or JSON）
```

## Detailed Design

### プロジェクト構成

```
src/
  main.rs        - エントリポイント・エラーハンドリング（anyhow）
  cli.rs         - clap v4 derive による Args 構造体
  language.rs    - Language enum + LanguageDef（拡張子→言語マッピング）
  counter.rs     - 1ファイルの行カウントロジック（ステートマシン）
  walker.rs      - ignore クレートのラッパー（.gitignore + glob統合）
  aggregator.rs  - FileStats → LangSummary / DirSummary
  reporter/
    mod.rs       - Reporter trait
    table.rs     - tabled クレートによるテーブル出力
    json.rs      - serde_json による JSON 出力
tests/
  integration/
    count_test.rs
    fixtures/    - 既知行数のテスト用ファイル群
```

### 依存クレート

| 用途 | クレート | バージョン目安 |
|------|---------|------------|
| ディレクトリ走査 + .gitignore + glob | `ignore` | 0.4 |
| 並列処理 | `rayon` | 1.x |
| CLI引数 | `clap` v4 (derive feature) | 4.x |
| JSON出力 | `serde` + `serde_json` | 1.x |
| テーブル出力 | `tabled` | 0.14+ |
| エラー処理 | `anyhow` | 1.x |

### データモデル

```rust
/// 1ファイルの行数統計
struct FileStats {
    path: PathBuf,
    language: Language,
    total_lines: u64,
    code_lines: u64,
    blank_lines: u64,
    comment_lines: u64,
}

/// 言語別集計
struct LangSummary {
    language: Language,
    files: u64,
    total_lines: u64,
    code_lines: u64,
    blank_lines: u64,
    comment_lines: u64,
}

/// ディレクトリ別集計
struct DirSummary {
    path: PathBuf,
    by_language: HashMap<Language, LangSummary>,
}

/// 最終レポート
struct Report {
    total: LangSummary,
    by_language: Vec<LangSummary>,
    by_directory: Vec<DirSummary>,
}
```

### CLI引数設計（cli.rs）

```rust
#[derive(Parser)]
#[command(name = "qcount", about = "Fast source code line counter")]
struct Args {
    /// 対象ディレクトリ（デフォルト: カレント）
    path: Option<PathBuf>,

    /// JSON形式で出力
    #[arg(long)]
    json: bool,

    /// ディレクトリ別集計を表示
    #[arg(long)]
    by_dir: bool,

    /// 除外パターン（glob）
    #[arg(long)]
    exclude: Vec<String>,
}
```

### 言語定義（language.rs）

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
enum Language {
    Rust, Go, Python, JavaScript, TypeScript,
    Java, C, Cpp, Ruby, Shell, Yaml, Toml,
}

struct LanguageDef {
    name: &'static str,
    extensions: &'static [&'static str],
    line_comment: &'static [&'static str],
    block_comment_start: Option<&'static str>,
    block_comment_end: Option<&'static str>,
}
```

対応言語の初期セット（12言語）:
- Rust (`.rs`): `//`, `/* */`
- Go (`.go`): `//`, `/* */`
- Python (`.py`): `#`（docstringは文字列リテラル扱い）
- JavaScript (`.js`, `.mjs`): `//`, `/* */`
- TypeScript (`.ts`): `//`, `/* */`
- Java (`.java`): `//`, `/* */`
- C (`.c`, `.h`): `//`, `/* */`
- C++ (`.cpp`, `.cc`, `.cxx`, `.hpp`): `//`, `/* */`
- Ruby (`.rb`): `#`
- Shell (`.sh`): `#`
- YAML (`.yaml`, `.yml`): `#`
- TOML (`.toml`): `#`

### 行カウントロジック（counter.rs）

簡易ステートマシンで処理:

```
状態: { Normal, InBlockComment }

各行に対して:
1. トリム後が空 → blank_lines++
2. InBlockComment状態 → comment_lines++、block_end検索
3. Normal状態:
   - 行コメント記号で始まる → comment_lines++
   - block_start を含む → comment_lines++、InBlockComment遷移
   - それ以外 → code_lines++
```

制約・許容誤差:
- 文字列内のコメント記号は誤検知を許容
- Python docstringはコメント扱いしない（文字列リテラル）
- バイナリファイルはWhitelist拡張子で除外

### ファイル走査（walker.rs）

`ignore::Walk`でファイルを収集後、`rayon`で並列処理:

```rust
fn walk(root: &Path, excludes: &[String]) -> Vec<DirEntry> {
    WalkBuilder::new(root)
        .hidden(true)
        .git_ignore(true)
        .add_custom_ignore_filename(".qcountignore")
        .build()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
        .collect()
}
```

注意: `ignore::WalkParallel`はcallbackベースで扱いにくいため、`Walk`で`collect`後に`rayon`を使用する。

### 集計（aggregator.rs）

`Vec<FileStats>`を受け取り、言語別・ディレクトリ別にグループ化:
- `by_dir=false`: 言語別サマリーのみ
- `by_dir=true`: 言語別 + ディレクトリ別（0件ディレクトリはスキップ）

### 出力（reporter/）

```rust
trait Reporter {
    fn report(&self, report: &Report) -> Result<()>;
}
```

- `TableReporter`: `tabled`クレートでASCIIテーブル出力
- `JsonReporter`: `serde_json`でJSON出力（`serde::Serialize`を各構造体に付与）

### テスト戦略

**ユニットテスト**:
- `counter.rs`: 空行・コメント検出ロジックを各言語で検証
- `language.rs`: 拡張子から言語へのマッピング検証

**統合テスト** (`tests/integration/`):
- `fixtures/`に既知行数のファイル群を配置
- 実際に`qcount`を呼び出して期待値と照合

## Alternatives Considered

### WalkParallel vs Walk + rayon

`ignore::WalkParallel`はcallbackベースで実装が複雑になる。`Walk`で`Vec<DirEntry>`に`collect`してから`rayon::par_iter()`を使う方がコードの明快さを保ちつつ十分な並列性能を得られる。

### tabled vs prettytable-rs

`prettytable-rs`はメンテナンスが停滞気味で型安全性に劣る。`tabled`は型安全なAPIを持ちアクティブにメンテナンスされているため採用。

### 完全言語パーサー vs 簡易ステートマシン

完全パーサーは精度が高いが実装コストが高く、依存クレートも増える。ソースコード行数カウントの用途では多少の誤検知は許容範囲であり、簡易ステートマシンで十分な精度を得られる。
