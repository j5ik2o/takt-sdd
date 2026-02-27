# Proposal: qcount-design

## Background

Rustで実装する高速ファイル行数カウントCLIツール「qcount」を設計・実装する。
既存のソースコードリポジトリに対して、言語別・ディレクトリ別の行数統計（総行数・コード行・空白行・コメント行）を高速に収集・表示するツールが必要。
ripgrepが採用している`ignore`クレートを活用し、.gitignoreやglobパターンを自然に統合した並列処理パイプラインで実装する。

## Goal

- Rustで実装したCLIツール`qcount`を設計・実装する
- 指定ディレクトリ以下のソースファイルを並列走査し、言語別に行数統計を集計する
- テーブル形式およびJSON形式での出力をサポートする
- `--by-dir`オプションでディレクトリ別の集計も可能にする
- 12言語（Rust, Go, Python, JavaScript, TypeScript, Java, C, C++, Ruby, Shell, YAML, TOML）に対応する

## Non-Goals

- 完全な言語パーサーによる正確なコメント解析（簡易ステートマシンで許容誤差を受け入れる）
- コメント行数の完璧な検出（文字列内のコメント記号の誤検知は許容）
- 対応言語の網羅（12言語の初期セットのみ）
- IDEプラグインやGUIインターフェース
- リアルタイムファイル監視機能

## Approach

パイプライン構造でシンプルに実装する:

1. **Walk**: `ignore`クレートで.gitignore・globパターンを考慮しながらファイルを列挙
2. **Parallel Count**: `rayon`の`par_iter()`でファイル単位の並列行カウント
3. **Aggregate**: `FileStats`を言語別・ディレクトリ別に集計
4. **Report**: `tabled`クレートでテーブル出力、`serde_json`でJSON出力

モジュール構成:
- `main.rs`: エントリポイント・`anyhow`によるエラーハンドリング
- `cli.rs`: `clap` v4 derive による引数定義
- `language.rs`: Language enum + 拡張子→言語マッピング
- `counter.rs`: 1ファイルの行カウント（簡易ステートマシン）
- `walker.rs`: `ignore`クレートのラッパー
- `aggregator.rs`: FileStats → LangSummary / DirSummary
- `reporter/`: Reporter trait + テーブル・JSON実装

統合テストは`tests/integration/fixtures/`に既知行数のテスト用ファイルを配置して検証する。
