#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SDD Piece Test ==="
echo "Project: $(basename "${SCRIPT_DIR}")"
echo ""

"${SCRIPT_DIR}/run-takt.sh" \
  --piece sdd \
  --task "Rustで高速なテキスト検索CLIツール「qgrep」を作成する。要件: (1) 正規表現検索と固定文字列検索の両対応 (2) ディレクトリ再帰検索と .gitignore の尊重 (3) パス/拡張子の include・exclude フィルタ (4) 行番号・ファイル名付き出力 (5) 前後コンテキスト表示オプション (-A/-B/-C 相当) (6) 並列検索による高速化 (rayon 使用) (7) JSON 出力オプション (8) GNU grep 互換の終了コード (0: マッチあり, 1: マッチなし, 2: エラー)。cargo init からプロジェクトを構築し、ユニットテストと統合テストを含めること。" \
  --pipeline \
  --skip-git \
  --create-worktree no
