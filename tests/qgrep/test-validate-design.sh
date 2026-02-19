#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SDD Piece Test ==="
echo "Project: $(basename "${SCRIPT_DIR}")"
echo ""

"${SCRIPT_DIR}/run-takt.sh" \
  --piece sdd-validate-design \
  --task "feature=qgrep" \
  --pipeline \
  --skip-git \
  --create-worktree no
