#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${SKILL_DIR}"

# ── uv の確認 ────────────────────────────────────────
if ! command -v uv &>/dev/null; then
  echo "ERROR: uv is not installed. See https://docs.astral.sh/uv/" >&2
  exit 1
fi

# ── 依存インストール ─────────────────────────────────
echo "==> Installing dependencies"
uv sync --group dev

# ── ユニットテスト ───────────────────────────────────
echo "==> Running unit tests"
uv run pytest -m "not integration"

# ── スキルバリデーション ─────────────────────────────
echo "==> Validating skill"
uv run python scripts/quick_validate.py .

echo ""
echo "All checks passed."
