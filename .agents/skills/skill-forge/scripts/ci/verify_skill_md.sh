#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${SKILL_DIR}"

# ── 前提条件の確認 ───────────────────────────────────
if ! command -v uv &>/dev/null; then
  echo "ERROR: uv is not installed." >&2
  exit 1
fi

# Claude Code セッション内からの claude -p ネスト実行は動作しないためスキップ
if [[ -n "${CLAUDECODE:-}" || -n "${CLAUDE_CODE_ENTRYPOINT:-}" ]]; then
  echo "SKIP: Running inside Claude Code session. Integration tests require a standalone terminal." >&2
  exit 0
fi

if ! command -v claude &>/dev/null; then
  if [[ -n "${CI:-}" ]]; then
    echo "ERROR: claude CLI not found in PATH in CI." >&2
    exit 1
  fi
  echo "SKIP: claude CLI not found in PATH. Skipping SKILL.md trigger eval." >&2
  exit 0
fi

# ── 依存インストール ─────────────────────────────────
uv sync --group dev

# ── SKILL.md トリガーテスト ──────────────────────────
echo "==> Running SKILL.md trigger tests"
uv run pytest tests/test_skill_md.py -v -m integration
