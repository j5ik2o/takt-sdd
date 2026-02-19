#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SDD Piece Test ==="
echo "Project: $(basename "${SCRIPT_DIR}")"
echo ""

"${SCRIPT_DIR}/run-takt.sh" \
  --piece sdd \
  --task "Rustで高速なファイル検索CLIツール「qfind」を作成する。要件: (1) globパターンによるファイル名マッチング (2) 正規表現による内容検索 (3) .gitignoreの尊重 (4) 並列ディレクトリ走査(rayon使用) (5) 結果のJSON出力オプション (6) 最大深度制限オプション。cargo initからプロジェクトを構築し、ユニットテストと統合テストを含めること。" \
  --pipeline \
  --skip-git \
  --create-worktree no
