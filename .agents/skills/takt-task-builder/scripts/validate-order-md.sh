#!/usr/bin/env bash
#
# validate-order-md.sh
# .takt/tasks/*/order.md が正しい構造を持つか検証する
#
# 使用方法:
#   ./scripts/validate-order-md.sh           # 全ファイルを検証
#   ./scripts/validate-order-md.sh --quiet   # エラーと警告のみ表示
#
# 終了コード:
#   0 = 全て正常
#   1 = バリデーションエラーあり

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
TASKS_DIR="${REPO_ROOT}/.takt/tasks"
TASKS_YAML="${REPO_ROOT}/.takt/tasks.yaml"

ERRORS=0
WARNINGS=0
QUIET=false

for arg in "$@"; do
  case "$arg" in
    --quiet|-q) QUIET=true ;;
  esac
done

# ──────────────────────────────────────
# ユーティリティ
# ──────────────────────────────────────
error() {
  echo "  ❌ ERROR: $*"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo "  ⚠️  WARN:  $*"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  if [[ "$QUIET" == false ]]; then
    echo "  ✅ OK:    $*"
  fi
}

info() {
  if [[ "$QUIET" == false ]]; then
    echo "$*"
  fi
}

# ──────────────────────────────────────
# order.md バリデーション
# ──────────────────────────────────────
validate_order_md() {
  local file="$1"
  local slug
  slug="$(basename "$(dirname "$file")")"

  info ""
  info "── .takt/tasks/${slug}/order.md"

  # 1. slug フォーマット: YYYYMMDD-HHmmss-{6文字英数字}
  if [[ "$slug" =~ ^[0-9]{8}-[0-9]{6}-[a-zA-Z0-9]{6}$ ]]; then
    ok "slug形式: ${slug}"
  else
    warn "slug形式が推奨外 (期待: YYYYMMDD-HHmmss-xxxxxx): ${slug}"
  fi

  # 2. 空ファイルチェック
  if [[ ! -s "$file" ]]; then
    error "order.md が空です"
    return
  fi

  # 3. ## 目的 セクション（内容必須）
  if grep -qE "^## 目的[[:space:]]*$" "$file"; then
    local mokuteki
    mokuteki=$(awk '/^## 目的[[:space:]]*$/{flag=1; next} /^## /{flag=0} flag && NF' "$file" | head -1)
    if [[ -n "$mokuteki" ]]; then
      ok "## 目的: 内容あり"
    else
      error "## 目的 セクションが空です（目的を1〜2文で記述してください）"
    fi
  else
    error "## 目的 セクションがありません"
  fi

  # 4. ## 要件 セクション（- [ ] チェックボックス必須）
  if grep -qE "^## 要件[[:space:]]*$" "$file"; then
    local yoken_count
    yoken_count=$(awk '/^## 要件[[:space:]]*$/{flag=1; next} /^## /{flag=0} flag' "$file" \
      | grep -cE "^- \[[ xX]\]" || true)
    if [[ "$yoken_count" -ge 1 ]]; then
      ok "## 要件: ${yoken_count}件（チェックボックスあり）"
    else
      error "## 要件 セクションに '- [ ]' チェックボックスアイテムがありません"
    fi
  else
    error "## 要件 セクションがありません"
  fi

  # 5. ## 受け入れ基準 セクション（項目必須）
  if grep -qE "^## 受け入れ基準[[:space:]]*$" "$file"; then
    local criteria_count
    criteria_count=$(awk '/^## 受け入れ基準[[:space:]]*$/{flag=1; next} /^## /{flag=0} flag' "$file" \
      | grep -cE "^- " || true)
    if [[ "$criteria_count" -ge 1 ]]; then
      ok "## 受け入れ基準: ${criteria_count}件"
    else
      error "## 受け入れ基準 セクションに項目がありません"
    fi
  else
    error "## 受け入れ基準 セクションがありません"
  fi
}

# ──────────────────────────────────────
# tasks.yaml クロスチェック
# ──────────────────────────────────────
check_tasks_yaml() {
  if [[ ! -f "$TASKS_YAML" ]]; then
    return
  fi

  info ""
  info "=== tasks.yaml クロスチェック ==="

  # task_dir 行をシンプルにgrep抽出（フラットなYAML構造前提）
  local task_dirs
  task_dirs=$(grep -E "^[[:space:]]+task_dir:" "$TASKS_YAML" \
    | sed "s/.*task_dir:[[:space:]]*//" \
    | tr -d '"' \
    | tr -d "'" \
    || true)

  if [[ -z "$task_dirs" ]]; then
    info "  task_dir エントリが見つかりません"
    return
  fi

  while IFS= read -r task_dir; do
    [[ -z "$task_dir" ]] && continue
    local order_md="${REPO_ROOT}/${task_dir}/order.md"
    if [[ -f "$order_md" ]]; then
      ok "task_dir=${task_dir} → order.md 存在"
    else
      error "task_dir=${task_dir} → order.md が見つかりません"
    fi
  done <<< "$task_dirs"
}

# ──────────────────────────────────────
# メイン
# ──────────────────────────────────────
main() {
  info "=== order.md バリデーション ==="

  check_tasks_yaml

  info ""
  info "=== order.md コンテンツチェック ==="

  if [[ ! -d "$TASKS_DIR" ]]; then
    info ""
    info "ℹ️  .takt/tasks/ ディレクトリが存在しません（タスクがまだ作成されていません）"
    info ""
    info "────────────────────────────────────────"
    echo "合計: 0 ファイル | エラー: ${ERRORS} | 警告: ${WARNINGS}"
    if [[ "$ERRORS" -gt 0 ]]; then
      exit 1
    fi
    exit 0
  fi

  local found=0
  while IFS= read -r file; do
    validate_order_md "$file"
    found=$((found + 1))
  done < <(find "$TASKS_DIR" -maxdepth 2 -name "order.md" -print 2>/dev/null | sort)

  info ""
  info "────────────────────────────────────────"
  echo "合計: ${found} ファイル検査 | エラー: ${ERRORS} | 警告: ${WARNINGS}"

  if [[ "$ERRORS" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
