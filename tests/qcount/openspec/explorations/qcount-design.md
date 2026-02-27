# qcount 設計探索メモ

**トピック**: `qcount-design`
**日付**: 2026-02-28
**概要**: Rust製高速ファイル行数カウントCLIツール「qcount」の設計探索

---

## 主な発見とインサイト

### アーキテクチャ

パイプライン構造が核心:

```
Walk（ignore クレート）
  → collect Vec<DirEntry>
  → rayon::par_iter() でファイル単位並列処理
  → Vec<FileStats> に集計
  → Reporter（テーブル or JSON）
```

並列粒度はファイル単位が最適。ディレクトリ単位は粒度が粗すぎる。

### モジュール構成

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

---

## 決定事項

### クレート選定

| 用途 | 採用クレート | 根拠 |
|------|------------|------|
| ディレクトリ走査 + .gitignore + glob | `ignore` | ripgrep が使用。3機能が1クレートに統合 |
| 並列処理 | `rayon` | `par_iter()` で自然に並列化 |
| CLI引数 | `clap` v4 (derive) | 型安全・ボイラープレート最小 |
| JSON出力 | `serde` + `serde_json` | Rust標準的選択 |
| テーブル出力 | `tabled` | `prettytable-rs`より型安全 |
| エラー処理 | `anyhow` | mainレベルのエラーハンドリングに十分 |
| glob単体 | 不採用 | `ignore` 内包の `globset` で代替 |

### コメント検出方針

完全な言語パーサーは複雑すぎる。簡易ステートマシンで許容誤差を受け入れる:

- 行コメント: トリム後の行頭がコメント記号で始まる行
- ブロックコメント: in_block: bool フラグで状態管理
- 文字列内のコメント記号は誤検知を許容

---

## 主要データ構造スケッチ

FileStats { path, language, total_lines, code_lines, blank_lines, comment_lines }
LangSummary { language, files, total_lines, code_lines, blank_lines, comment_lines }
DirSummary { path, by_language: HashMap<Language, LangSummary> }
Report { total: LangSummary, by_language: Vec<LangSummary>, by_directory: Vec<DirSummary> }

---

## 対応言語 初期セット（12言語）

Rust, Go, Python, JavaScript, TypeScript, Java, C, C++, Ruby, Shell, YAML, TOML

---

## テスト戦略

- ユニットテスト: counter.rs（空行・コメント検出ロジック）、language.rs（拡張子マッピング）
- 統合テスト: tests/integration/fixtures/ に既知行数のプロジェクトを配置して検証

---

## 実装時の注意点・落とし穴

1. バイナリファイル除外: 対応拡張子ホワイトリスト方式で十分
2. ignore::WalkParallel は callback ベースで扱いにくい。Walk で collect 後に rayon 推奨
3. Python docstring は文字列リテラル扱い（コメント行に含めない）
4. --by-dir 時に 0 件ディレクトリをスキップ
5. シンボリックリンク: ignore クレートはデフォルトでたどらない（適切）

---

## 推奨される次のステップ

1. opsx:propose で変更提案を作成
2. language.rs から実装開始（データ駆動設計の核）
3. counter.rs + ユニットテスト
4. walker.rs + aggregator.rs
5. reporter/ の実装
6. 統合テスト追加
