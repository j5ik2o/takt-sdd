#!/usr/bin/env bash
#
# validate-takt-files.sh
# .takt/*/workflows/*.yaml と .takt/*/facets/**/*.md を検証する
#
# 使用方法:
#   ./scripts/validate-takt-files.sh             # 全ファイルを検証
#   ./scripts/validate-takt-files.sh --quiet     # エラーと警告のみ表示
#   ./scripts/validate-takt-files.sh --workflows # ワークフローYAMLのみ
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
CHECK_WORKFLOWS=true
CHECK_FACETS=true

for arg in "$@"; do
  case "$arg" in
    --quiet|-q)    QUIET=true ;;
    --workflows)   CHECK_FACETS=false ;;
    --facets)      CHECK_WORKFLOWS=false ;;
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
# ワークフロー YAML バリデーション
# ──────────────────────────────────────
validate_workflow() {
  local file="$1"
  local rel="${file#${REPO_ROOT}/}"
  local workflow_dir
  workflow_dir="$(dirname "$file")"

  info ""
  info "── ${rel}"

  # 空ファイルチェック
  if [[ ! -s "$file" ]]; then
    error "ファイルが空です"
    return
  fi

  # 必須フィールド: name
  if grep -qE "^name:[[:space:]]+.+" "$file"; then
    local workflow_name
    workflow_name=$(grep -E "^name:" "$file" | head -1 | sed 's/^name:[[:space:]]*//')
    ok "name: ${workflow_name}"
  else
    error "必須フィールド 'name' がありません（または空です）"
  fi

  # 必須フィールド: initial_step（エイリアス: initial_movement）
  local initial_step=""
  if grep -qE "^initial_step:[[:space:]]+.+" "$file"; then
    initial_step=$(grep -E "^initial_step:" "$file" | head -1 | sed 's/^initial_step:[[:space:]]*//')
    ok "initial_step: ${initial_step}"
  elif grep -qE "^initial_movement:[[:space:]]+.+" "$file"; then
    initial_step=$(grep -E "^initial_movement:" "$file" | head -1 | sed 's/^initial_movement:[[:space:]]*//')
    warn "非推奨キー 'initial_movement' が使用されています。'initial_step' への移行を推奨します"
    ok "initial_movement（→initial_step）: ${initial_step}"
  else
    error "必須フィールド 'initial_step' がありません（または空です）"
  fi

  # 必須フィールド: steps（エイリアス: movements）
  local steps_key=""
  if grep -qE "^steps:" "$file"; then
    steps_key="steps"
  elif grep -qE "^movements:" "$file"; then
    steps_key="movements"
    warn "非推奨キー 'movements' が使用されています。'steps' への移行を推奨します"
  fi

  if [[ -z "$steps_key" ]]; then
    error "必須フィールド 'steps' がありません"
    return
  fi

  local step_count
  step_count=$(grep -cE "^  - name:[[:space:]]+.+" "$file" || true)
  if [[ "$step_count" -eq 0 ]]; then
    error "'${steps_key}' にエントリがありません"
    return
  fi
  ok "${steps_key}: ${step_count} 件"

  # initial_step が steps 内に存在するか
  # grep -F で固定文字列マッチし regex インジェクションを防ぐ
  if [[ -n "$initial_step" ]]; then
    if grep -E "^  - name:[[:space:]]+" "$file" \
        | sed 's/^  - name:[[:space:]]*//' \
        | grep -qxF "$initial_step"; then
      ok "initial_step '${initial_step}' → step 存在確認"
    else
      error "initial_step '${initial_step}' が ${steps_key} に定義されていません"
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
      abs_path=$(normalize_path "$workflow_dir" "$facet_ref")
      if [[ -f "$abs_path" ]]; then
        ok "参照: ${facet_ref}"
      else
        error "参照先が見つかりません: ${facet_ref}"
      fi
    done <<< "$facet_refs"
  fi

  # loop_monitors の整合性チェック
  local loop_check
  loop_check=$(ruby - "$file" <<'RUBY'
require "yaml"

file = ARGV[0]
doc = YAML.load_file(file)
steps = doc["steps"] || doc["movements"] || []
loop_monitors = doc["loop_monitors"] || []

step_reports = Hash.new { |h, k| h[k] = [] }

report_names = lambda do |step_node|
  report_entries = step_node.dig("output_contracts", "report") || []
  report_entries.filter_map do |entry|
    name = entry.is_a?(Hash) ? entry["name"] : nil
    name unless name.nil? || name.empty?
  end
end

steps.each do |step|
  next unless step.is_a?(Hash)
  name = step["name"]
  next unless name && !name.empty?
  step_reports[name].concat(report_names.call(step))

  parallel = step["parallel"] || []
  parallel.each do |substep|
    sub_name = substep.is_a?(Hash) ? substep["name"] : nil
    next unless sub_name && !sub_name.empty?
    sub_reports = report_names.call(substep)
    step_reports[sub_name].concat(sub_reports)
    step_reports[name].concat(sub_reports)
    step_reports[sub_name].uniq!
  end
  step_reports[name].uniq!
end

loop_monitors.each_with_index do |monitor, idx|
  next unless monitor.is_a?(Hash)
  cycle = monitor["cycle"] || []
  cycle = [] unless cycle.is_a?(Array)
  cycle = cycle.map(&:to_s)
  first = cycle[0]

  cycle.each do |step_name|
    unless step_reports.key?(step_name) || steps.any? { |s| s.is_a?(Hash) && s["name"].to_s == step_name }
      puts "ERROR|loop_monitors[#{idx}]: cycle に未定義 step '#{step_name}' があります"
    end
  end

  rules = monitor.dig("judge", "rules") || []
  healthy_rule = rules.find do |r|
    next false unless r.is_a?(Hash)
    condition = r["condition"].to_s
    condition.include?("健全") || condition.downcase.include?("healthy")
  end

  if healthy_rule
    healthy_next = healthy_rule["next"].to_s
    if first && !first.empty? && healthy_next != first
      puts "ERROR|loop_monitors[#{idx}]: 健全時 next='#{healthy_next}' が cycle 先頭 '#{first}' と不一致です"
    end
  else
    puts "WARN|loop_monitors[#{idx}]: 健全条件（condition に 健全/healthy を含むルール）が見つかりません"
  end

  template = monitor.dig("judge", "instruction_template").to_s
  report_refs = template.scan(/\{report:([^}]+)\}/).flatten.uniq
  allowed_reports = cycle.flat_map { |step_name| step_reports[step_name] }.compact.uniq

  report_refs.each do |report_name|
    unless allowed_reports.include?(report_name)
      puts "ERROR|loop_monitors[#{idx}]: report '#{report_name}' は cycle 内 step 生成物ではありません"
    end
  end
end
RUBY
)

  if [[ -n "$loop_check" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local level
      level=$(echo "$line" | cut -d'|' -f1)
      local msg
      msg=$(echo "$line" | cut -d'|' -f2-)
      if [[ "$level" == "ERROR" ]]; then
        error "$msg"
      else
        warn "$msg"
      fi
    done <<< "$loop_check"
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
  local workflow_count=0

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

  # ──── ワークフロー検証 ────
  if [[ "$CHECK_WORKFLOWS" == true ]]; then
    info ""
    info "=== ワークフロー (.yaml) チェック ==="

    while IFS= read -r file; do
      validate_workflow "$file"
      workflow_count=$((workflow_count + 1))
    done < <(find "${TAKT_DIR}" -path "*/workflows/*.yaml" -print 2>/dev/null | sort)

    if [[ "$workflow_count" -eq 0 ]]; then
      info "  ワークフローファイルが見つかりませんでした"
    fi
  fi

  info ""
  info "────────────────────────────────────────"
  echo "ファセット: ${facet_count} / ワークフロー: ${workflow_count} | エラー: ${ERRORS} | 警告: ${WARNINGS}"

  if [[ "$ERRORS" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
