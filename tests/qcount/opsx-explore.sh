#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SDD Piece Test ==="
echo "Project: $(basename "${SCRIPT_DIR}")"
echo ""

"${SCRIPT_DIR}/run-takt.sh" \
  -w opsx-explore \
  --skip-git \
  --create-worktree no

# Rustで高速なファイル・行数カウントCLIツール「qcount」を作成する。要件: (1) 言語別のファイル数・行数・空行数・コメント行数の集計 (2) globパターンによるファイルフィルタリング (3) .gitignoreの尊重 (4) 並列ディレクトリ走査(rayon使用) (5) 結果のJSON出力オプション (6) ディレクトリ単位のサマリー表示。cargo initからプロジェクトを構築し、ユニットテストと統合テストを含めること。
