#!/usr/bin/env bash
#
# validate-takt-files.sh
# .takt/*/pieces/*.yaml と .takt/*/facets/**/*.md を検証する
#
# 使用方法:
#   ./scripts/validate-takt-files.sh             # 全ファイルを検証
#   ./scripts/validate-takt-files.sh --quiet     # エラーと警告のみ表示
#   ./scripts/validate-takt-files.sh --pieces    # ピースYAMLのみ
#   ./scripts/validate-takt-files.sh --facets    # ファセット.mdのみ
#
# 終了コード:
#   0 = 全て正常
#   1 = バリデーションエラーあり

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
TAKT_DIR="${REPO_ROOT}/.takt"

ERRORS=0
WARNINGS=0
QUIET=false
CHECK_PIECES=true
CHECK_FACETS=true

for arg in "$@"; do
  case "$arg" in
    --quiet|-q)  QUIET=true ;;
    --pieces)    CHECK_FACETS=false ;;
    --facets)    CHECK_PIECES=false ;;
  esac
done

# ──────────────────────────────────────
# ユーティリティ
# ──────────────────────────────────────
error() { echo "  ❌ ERROR: $*"; ERRORS=$((ERRORS + 1)); }
warn()  { echo "  ⚠️  WARN:  $*"; WARNINGS=$((WARNINGS + 1)); }
ok()    { if [[ "$QUIET" == false ]]; then echo "  ✅ OK:    $*"; fi; }
info()  { if [[ "$QUIET" == false ]]; then echo "$*"; fi; }

# 相対パスを正規化して絶対パスを返す
# Usage: normalize_path <base_dir> <relative_path>
normalize_path() {
  local base_dir="$1"
  local rel_path="$2"
  # 引数を sys.argv 経由で渡し Python コードインジェクションを防ぐ
  python3 - "$base_dir" "$rel_path" 2>/dev/null <<'PYEOF' \
    || echo "${base_dir}/${rel_path}"
import os, sys
print(os.path.normpath(os.path.join(sys.argv[1], sys.argv[2])))
PYEOF
}

# ──────────────────────────────────────
# ファセット .md バリデーション
# ──────────────────────────────────────

# ファセット種別: personas / policies / knowledge → # 見出し必須
# ファセット種別: instructions / output-contracts  → 内容存在のみ

validate_facet() {
  local file="$1"
  local facet_type="$2"
  local rel="${file#${REPO_ROOT}/}"

  # 空ファイルチェック
  if [[ ! -s "$file" ]]; then
    error "${rel}: ファイルが空です"
    return
  fi

  case "$facet_type" in
    personas|policies|knowledge)
      if grep -qE "^# .+" "$file"; then
        ok "${rel}"
      else
        error "${rel}: '# タイトル' 見出しがありません（${facet_type} は # 見出しが必須）"
      fi
      ;;
    instructions|output-contracts)
      # 空白行のみでないことを確認
      if grep -qE "[^[:space:]]" "$file"; then
        ok "${rel}"
      else
        error "${rel}: ファイルに内容がありません"
      fi
      ;;
    *)
      ok "${rel}"
      ;;
  esac
}

# ──────────────────────────────────────
# ピース YAML バリデーション
# ──────────────────────────────────────
validate_piece() {
  local file="$1"
  local rel="${file#${REPO_ROOT}/}"
  local piece_dir
  piece_dir="$(dirname "$file")"

  info ""
  info "── ${rel}"

  # 空ファイルチェック
  if [[ ! -s "$file" ]]; then
    error "ファイルが空です"
    return
  fi

  # 必須フィールド: name
  if grep -qE "^name:[[:space:]]+.+" "$file"; then
    local piece_name
    piece_name=$(grep -E "^name:" "$file" | head -1 | sed 's/^name:[[:space:]]*//')
    ok "name: ${piece_name}"
  else
    error "必須フィールド 'name' がありません（または空です）"
  fi

  # 必須フィールド: initial_movement
  local initial_movement=""
  if grep -qE "^initial_movement:[[:space:]]+.+" "$file"; then
    initial_movement=$(grep -E "^initial_movement:" "$file" | head -1 | sed 's/^initial_movement:[[:space:]]*//')
    ok "initial_movement: ${initial_movement}"
  else
    error "必須フィールド 'initial_movement' がありません（または空です）"
  fi

  # 必須フィールド: movements
  if ! grep -qE "^movements:" "$file"; then
    error "必須フィールド 'movements' がありません"
    return
  fi

  local movement_count
  movement_count=$(grep -cE "^  - name:[[:space:]]+.+" "$file" || true)
  if [[ "$movement_count" -eq 0 ]]; then
    error "'movements' にエントリがありません"
    return
  fi
  ok "movements: ${movement_count} 件"

  # initial_movement が movements 内に存在するか
  # grep -F で固定文字列マッチし regex インジェクションを防ぐ
  if [[ -n "$initial_movement" ]]; then
    if grep -E "^  - name:[[:space:]]+" "$file" \
        | sed 's/^  - name:[[:space:]]*//' \
        | grep -qxF "$initial_movement"; then
      ok "initial_movement '${initial_movement}' → movement 存在確認"
    else
      error "initial_movement '${initial_movement}' が movements に定義されていません"
    fi
  fi

  # ファセットファイル参照の存在チェック
  # トップレベルの alias ブロック（personas/policies/instructions/knowledge/report_formats）から
  # "  key: ../path/to/file.md" 形式の行を抽出
  local facet_refs
  facet_refs=$(grep -E "^[[:space:]]+[a-zA-Z0-9_-]+:[[:space:]]+\.\./.*\.md[[:space:]]*$" "$file" \
    | sed 's/^[[:space:]]*[a-zA-Z0-9_-]*:[[:space:]]*//' \
    | tr -d '"' | tr -d "'" \
    || true)

  if [[ -n "$facet_refs" ]]; then
    while IFS= read -r facet_ref; do
      [[ -z "$facet_ref" ]] && continue
      local abs_path
      abs_path=$(normalize_path "$piece_dir" "$facet_ref")
      if [[ -f "$abs_path" ]]; then
        ok "参照: ${facet_ref}"
      else
        error "参照先が見つかりません: ${facet_ref}"
      fi
    done <<< "$facet_refs"
  fi
}

# ──────────────────────────────────────
# メイン
# ──────────────────────────────────────
main() {
  info "=== takt ファイル バリデーション ==="
  info "対象: ${TAKT_DIR}"

  if [[ ! -d "$TAKT_DIR" ]]; then
    echo "ℹ️  .takt/ ディレクトリが存在しません"
    exit 0
  fi

  local facet_count=0
  local piece_count=0

  # ──── ファセット検証 ────
  if [[ "$CHECK_FACETS" == true ]]; then
    info ""
    info "=== ファセット (.md) チェック ==="

    for lang_dir in "${TAKT_DIR}"/*/; do
      [[ -d "${lang_dir}facets" ]] || continue
      local lang
      lang=$(basename "$lang_dir")
      for facet_type_dir in "${lang_dir}facets"/*/; do
        [[ -d "$facet_type_dir" ]] || continue
        local facet_type
        facet_type=$(basename "$facet_type_dir")
        while IFS= read -r file; do
          validate_facet "$file" "$facet_type"
          facet_count=$((facet_count + 1))
        done < <(find "$facet_type_dir" -maxdepth 2 -name "*.md" -print 2>/dev/null | sort)
      done
    done
  fi

  # ──── ピース検証 ────
  if [[ "$CHECK_PIECES" == true ]]; then
    info ""
    info "=== ピース (.yaml) チェック ==="

    while IFS= read -r file; do
      validate_piece "$file"
      piece_count=$((piece_count + 1))
    done < <(find "${TAKT_DIR}" -path "*/pieces/*.yaml" -print 2>/dev/null | sort)

    if [[ "$piece_count" -eq 0 ]]; then
      info "  ピースファイルが見つかりませんでした"
    fi
  fi

  info ""
  info "────────────────────────────────────────"
  echo "ファセット: ${facet_count} / ピース: ${piece_count} | エラー: ${ERRORS} | 警告: ${WARNINGS}"

  if [[ "$ERRORS" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
