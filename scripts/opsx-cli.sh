#!/usr/bin/env bash
set -euo pipefail

# opsx-cli.sh - OpenSpec CLI replacement (no external dependency)
# Built-in spec-driven schema with artifacts: proposal, design, tasks

OPENSPEC_DIR="openspec"

# ──────────────────────────────────────────────
# Built-in spec-driven schema
# ──────────────────────────────────────────────
# Artifact definitions: id, filename, dependencies (comma-separated or empty)
SCHEMA_NAME="spec-driven"
ARTIFACT_IDS=("proposal" "design" "tasks")
ARTIFACT_FILES=("proposal.md" "design.md" "tasks.md")
ARTIFACT_DEPS=("" "proposal" "design")
APPLY_REQUIRES=("tasks")

# ──────────────────────────────────────────────
# Built-in templates
# ──────────────────────────────────────────────
TEMPLATE_PROPOSAL='# Proposal: {change-name}

## Background
<!-- Why is this change needed? -->

## Goal
<!-- What will this change accomplish? -->

## Non-Goals
<!-- What is explicitly out of scope? -->

## Approach
<!-- High-level approach to achieve the goal -->'

TEMPLATE_DESIGN='# Design: {change-name}

## Overview
<!-- High-level design overview -->

## Detailed Design
<!-- Implementation details -->

## Alternatives Considered
<!-- What alternatives were evaluated? -->'

TEMPLATE_TASKS='# Tasks: {change-name}

## Task List
<!-- Break down the implementation into concrete tasks -->

- [ ] Task 1: description
- [ ] Task 2: description'

# ──────────────────────────────────────────────
# Built-in instructions per artifact
# ──────────────────────────────────────────────
INSTRUCTION_PROPOSAL='Write a clear and concise proposal. Focus on the WHY (background/motivation), WHAT (goal), and high-level HOW (approach). Include non-goals to set boundaries. Keep it actionable and specific to the change.'

INSTRUCTION_DESIGN='Create a detailed technical design based on the proposal. Cover architecture decisions, data models, API changes, and implementation approach. Reference the proposal for context. Consider alternatives and explain why the chosen approach is preferred.'

INSTRUCTION_TASKS='Break down the design into concrete, implementable tasks. Each task should be small enough to complete in one session. Use checkbox format (- [ ] Task). Order tasks by dependency. Include acceptance criteria where helpful.'

INSTRUCTION_APPLY='Read the context files (proposal, design, tasks) to understand the change. Implement tasks one by one, marking each complete after implementation. Keep changes minimal and focused per task.'

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\t'/\\t}"
  # Replace newlines with \n
  s="${s//$'\n'/\\n}"
  printf '%s' "$s"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

change_dir() {
  local name="$1"
  echo "${OPENSPEC_DIR}/changes/${name}"
}

read_config_block() {
  local field="$1"
  local config_file="${OPENSPEC_DIR}/config.yaml"
  if [[ ! -f "$config_file" ]]; then
    return
  fi
  awk -v field="$field" '
    BEGIN { found=0 }
    $0 ~ "^"field":" { found=1; next }
    found && /^[^ #]/ { exit }
    found && /^  / { sub(/^  /, ""); print }
  ' "$config_file" 2>/dev/null || true
}

get_artifact_index() {
  local id="$1"
  for i in "${!ARTIFACT_IDS[@]}"; do
    if [[ "${ARTIFACT_IDS[$i]}" == "$id" ]]; then
      echo "$i"
      return
    fi
  done
  echo "-1"
}

get_artifact_status() {
  local cdir="$1"
  local idx="$2"
  local file="${cdir}/${ARTIFACT_FILES[$idx]}"
  if [[ -f "$file" ]]; then
    echo "done"
  else
    # Check if dependencies are satisfied
    local deps="${ARTIFACT_DEPS[$idx]}"
    if [[ -z "$deps" ]]; then
      echo "ready"
    else
      IFS=',' read -ra dep_arr <<< "$deps"
      for dep in "${dep_arr[@]}"; do
        local dep_idx
        dep_idx=$(get_artifact_index "$dep")
        if [[ "$dep_idx" == "-1" ]]; then
          echo "blocked"
          return
        fi
        local dep_file="${cdir}/${ARTIFACT_FILES[$dep_idx]}"
        if [[ ! -f "$dep_file" ]]; then
          echo "blocked"
          return
        fi
      done
      echo "ready"
    fi
  fi
}

get_template() {
  local id="$1"
  case "$id" in
    proposal) echo "$TEMPLATE_PROPOSAL" ;;
    design) echo "$TEMPLATE_DESIGN" ;;
    tasks) echo "$TEMPLATE_TASKS" ;;
    *) echo "" ;;
  esac
}

get_instruction() {
  local id="$1"
  case "$id" in
    proposal) echo "$INSTRUCTION_PROPOSAL" ;;
    design) echo "$INSTRUCTION_DESIGN" ;;
    tasks) echo "$INSTRUCTION_TASKS" ;;
    apply) echo "$INSTRUCTION_APPLY" ;;
    *) echo "" ;;
  esac
}

# ──────────────────────────────────────────────
# Commands
# ──────────────────────────────────────────────

cmd_new_change() {
  local name="$1"
  local cdir
  cdir=$(change_dir "$name")

  if [[ -d "$cdir" ]]; then
    die "Change '${name}' already exists at ${cdir}"
  fi

  mkdir -p "$cdir"

  # Write .openspec.yaml
  cat > "${cdir}/.openspec.yaml" <<YAML
schema: ${SCHEMA_NAME}
name: ${name}
createdAt: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
YAML

  echo "Created change '${name}' at ${cdir}/"
}

cmd_status() {
  local name="$1"
  local json_mode="$2"
  local cdir
  cdir=$(change_dir "$name")

  if [[ ! -d "$cdir" ]]; then
    die "Change '${name}' not found at ${cdir}"
  fi

  if [[ "$json_mode" == "true" ]]; then
    # Build JSON
    local artifacts_json=""
    for i in "${!ARTIFACT_IDS[@]}"; do
      local id="${ARTIFACT_IDS[$i]}"
      local file="${ARTIFACT_FILES[$i]}"
      local deps="${ARTIFACT_DEPS[$i]}"
      local status
      status=$(get_artifact_status "$cdir" "$i")
      local output_path="${cdir}/${file}"

      if [[ -n "$artifacts_json" ]]; then
        artifacts_json="${artifacts_json},"
      fi
      local deps_json="[]"
      if [[ -n "$deps" ]]; then
        IFS=',' read -ra dep_arr <<< "$deps"
        deps_json="["
        local first=true
        for dep in "${dep_arr[@]}"; do
          if [[ "$first" != "true" ]]; then deps_json="${deps_json},"; fi
          deps_json="${deps_json}\"${dep}\""
          first=false
        done
        deps_json="${deps_json}]"
      fi

      artifacts_json="${artifacts_json}{\"id\":\"${id}\",\"file\":\"${file}\",\"outputPath\":\"${output_path}\",\"status\":\"${status}\",\"dependencies\":${deps_json}}"
    done

    # applyRequires JSON
    local apply_req_json="["
    local first=true
    for req in "${APPLY_REQUIRES[@]}"; do
      if [[ "$first" != "true" ]]; then apply_req_json="${apply_req_json},"; fi
      apply_req_json="${apply_req_json}\"${req}\""
      first=false
    done
    apply_req_json="${apply_req_json}]"

    printf '{"schemaName":"%s","changeName":"%s","changePath":"%s","applyRequires":%s,"artifacts":[%s]}\n' \
      "$SCHEMA_NAME" "$name" "$cdir" "$apply_req_json" "$artifacts_json"
  else
    # Human-readable
    echo "Change: ${name}"
    echo "Schema: ${SCHEMA_NAME}"
    echo "Path:   ${cdir}/"
    echo ""
    echo "Artifacts:"
    for i in "${!ARTIFACT_IDS[@]}"; do
      local id="${ARTIFACT_IDS[$i]}"
      local status
      status=$(get_artifact_status "$cdir" "$i")
      printf "  %-12s %s\n" "$id" "$status"
    done
  fi
}

cmd_instructions() {
  local artifact_id="$1"
  local name="$2"
  local json_mode="$3"
  local cdir
  cdir=$(change_dir "$name")

  if [[ ! -d "$cdir" ]]; then
    die "Change '${name}' not found at ${cdir}"
  fi

  if [[ "$artifact_id" == "apply" ]]; then
    cmd_instructions_apply "$name" "$json_mode"
    return
  fi

  local idx
  idx=$(get_artifact_index "$artifact_id")
  if [[ "$idx" == "-1" ]]; then
    die "Unknown artifact: ${artifact_id}"
  fi

  local file="${ARTIFACT_FILES[$idx]}"
  local output_path="${cdir}/${file}"
  local status
  status=$(get_artifact_status "$cdir" "$idx")
  local template
  template=$(get_template "$artifact_id")
  local instruction
  instruction=$(get_instruction "$artifact_id")
  local deps="${ARTIFACT_DEPS[$idx]}"

  # Read config context and rules
  local context
  context=$(read_config_block "context")
  local rules_block
  rules_block=$(read_config_block "rules")
  # Extract artifact-specific rules
  local artifact_rules=""
  if [[ -n "$rules_block" ]]; then
    artifact_rules=$(echo "$rules_block" | awk -v art="${artifact_id}:" '
      BEGIN { found=0 }
      $0 ~ "^"art { found=1; next }
      found && /^[^ ]/ { exit }
      found && /^  / { sub(/^  /, ""); print }
    ' 2>/dev/null || true)
  fi

  # Build dependencies JSON array with file paths
  local deps_json="[]"
  if [[ -n "$deps" ]]; then
    IFS=',' read -ra dep_arr <<< "$deps"
    deps_json="["
    local first=true
    for dep in "${dep_arr[@]}"; do
      local dep_idx
      dep_idx=$(get_artifact_index "$dep")
      if [[ "$dep_idx" != "-1" ]]; then
        local dep_file="${cdir}/${ARTIFACT_FILES[$dep_idx]}"
        if [[ "$first" != "true" ]]; then deps_json="${deps_json},"; fi
        deps_json="${deps_json}\"${dep_file}\""
        first=false
      fi
    done
    deps_json="${deps_json}]"
  fi

  if [[ "$json_mode" == "true" ]]; then
    local t_esc
    t_esc=$(json_escape "$template")
    local i_esc
    i_esc=$(json_escape "$instruction")
    local c_esc
    c_esc=$(json_escape "$context")
    local r_esc
    r_esc=$(json_escape "$artifact_rules")

    printf '{"artifactId":"%s","status":"%s","outputPath":"%s","template":"%s","instruction":"%s","context":"%s","rules":"%s","dependencies":%s}\n' \
      "$artifact_id" "$status" "$output_path" "$t_esc" "$i_esc" "$c_esc" "$r_esc" "$deps_json"
  else
    echo "Artifact: ${artifact_id}"
    echo "Status:   ${status}"
    echo "Output:   ${output_path}"
    echo ""
    echo "Template:"
    echo "$template"
    echo ""
    echo "Instruction:"
    echo "$instruction"
  fi
}

cmd_instructions_apply() {
  local name="$1"
  local json_mode="$2"
  local cdir
  cdir=$(change_dir "$name")

  # Check if all applyRequires are done
  local all_ready=true
  local missing=()
  for req in "${APPLY_REQUIRES[@]}"; do
    local idx
    idx=$(get_artifact_index "$req")
    if [[ "$idx" == "-1" ]] || [[ ! -f "${cdir}/${ARTIFACT_FILES[$idx]}" ]]; then
      all_ready=false
      missing+=("$req")
    fi
  done

  # Read tasks file for progress
  local tasks_file="${cdir}/tasks.md"
  local total=0
  local complete=0
  local task_list_json="[]"
  local state="blocked"

  if [[ "$all_ready" == "false" ]]; then
    state="blocked"
  elif [[ ! -f "$tasks_file" ]]; then
    state="blocked"
  else
    # Count tasks
    total=$(grep -c '^\- \[[ x]\]' "$tasks_file" 2>/dev/null || true)
    complete=$(grep -c '^\- \[x\]' "$tasks_file" 2>/dev/null || true)
    local remaining=$((total - complete))

    if [[ "$remaining" -eq 0 ]] && [[ "$total" -gt 0 ]]; then
      state="all_done"
    else
      state="in_progress"
    fi

    # Build task list JSON
    if [[ "$json_mode" == "true" ]]; then
      task_list_json="["
      local first=true
      while IFS= read -r line; do
        local task_status="pending"
        if [[ "$line" == *"[x]"* ]]; then
          task_status="done"
        fi
        local task_text
        task_text=$(echo "$line" | sed 's/^- \[[ x]\] //')
        local t_esc
        t_esc=$(json_escape "$task_text")
        if [[ "$first" != "true" ]]; then task_list_json="${task_list_json},"; fi
        task_list_json="${task_list_json}{\"text\":\"${t_esc}\",\"status\":\"${task_status}\"}"
        first=false
      done < <(grep '^\- \[[ x]\]' "$tasks_file" 2>/dev/null || true)
      task_list_json="${task_list_json}]"
    fi
  fi

  # Context files
  local context_files_json="["
  local cf_first=true
  for req in "${APPLY_REQUIRES[@]}"; do
    local idx
    idx=$(get_artifact_index "$req")
    if [[ "$idx" != "-1" ]]; then
      local cf="${cdir}/${ARTIFACT_FILES[$idx]}"
      if [[ "$cf_first" != "true" ]]; then context_files_json="${context_files_json},"; fi
      context_files_json="${context_files_json}\"${cf}\""
      cf_first=false
    fi
  done
  # Also include proposal and design as context
  for aid in "proposal" "design"; do
    local idx
    idx=$(get_artifact_index "$aid")
    if [[ "$idx" != "-1" ]]; then
      local cf="${cdir}/${ARTIFACT_FILES[$idx]}"
      # Avoid duplicates
      if [[ "$context_files_json" != *"\"${cf}\""* ]]; then
        if [[ "$cf_first" != "true" ]]; then context_files_json="${context_files_json},"; fi
        context_files_json="${context_files_json}\"${cf}\""
        cf_first=false
      fi
    fi
  done
  context_files_json="${context_files_json}]"

  local instruction
  instruction=$(get_instruction "apply")

  if [[ "$json_mode" == "true" ]]; then
    local i_esc
    i_esc=$(json_escape "$instruction")
    printf '{"state":"%s","changeName":"%s","tasksFile":"%s","contextFiles":%s,"progress":{"total":%d,"complete":%d,"remaining":%d},"tasks":%s,"instruction":"%s"}\n' \
      "$state" "$name" "$tasks_file" "$context_files_json" "$total" "$complete" "$((total - complete))" "$task_list_json" "$i_esc"
  else
    echo "Apply Status for: ${name}"
    echo "State: ${state}"
    if [[ "$state" == "blocked" ]]; then
      echo "Missing artifacts: ${missing[*]}"
    else
      echo "Progress: ${complete}/${total} tasks complete"
    fi
  fi
}

cmd_list() {
  local json_mode="$1"
  local changes_dir="${OPENSPEC_DIR}/changes"

  if [[ ! -d "$changes_dir" ]]; then
    if [[ "$json_mode" == "true" ]]; then
      echo '{"changes":[]}'
    else
      echo "No changes found."
    fi
    return
  fi

  local changes=()
  for entry in "$changes_dir"/*/; do
    [[ -d "$entry" ]] || continue
    local base
    base=$(basename "$entry")
    # Skip archive directory
    [[ "$base" == "archive" ]] && continue
    # Must have .openspec.yaml
    [[ -f "${entry}.openspec.yaml" ]] && changes+=("$base")
  done

  if [[ "$json_mode" == "true" ]]; then
    local json="["
    if [[ ${#changes[@]} -gt 0 ]]; then
      local first=true
      for name in "${changes[@]}"; do
        if [[ "$first" != "true" ]]; then json="${json},"; fi
        json="${json}\"${name}\""
        first=false
      done
    fi
    json="${json}]"
    printf '{"changes":%s}\n' "$json"
  else
    if [[ ${#changes[@]} -eq 0 ]]; then
      echo "No active changes."
    else
      echo "Active changes:"
      for name in "${changes[@]}"; do
        echo "  - ${name}"
      done
    fi
  fi
}

# ──────────────────────────────────────────────
# Argument parsing
# ──────────────────────────────────────────────
main() {
  if [[ $# -eq 0 ]]; then
    die "Usage: opsx-cli.sh <command> [options]"
  fi

  local cmd="$1"
  shift

  case "$cmd" in
    new)
      if [[ $# -lt 2 ]] || [[ "$1" != "change" ]]; then
        die "Usage: opsx-cli.sh new change <name>"
      fi
      shift  # skip "change"
      cmd_new_change "$1"
      ;;
    status)
      local name="" json_mode="false"
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --change) name="$2"; shift 2 ;;
          --json) json_mode="true"; shift ;;
          *) die "Unknown option: $1" ;;
        esac
      done
      if [[ -z "$name" ]]; then
        die "Usage: opsx-cli.sh status --change <name> [--json]"
      fi
      cmd_status "$name" "$json_mode"
      ;;
    instructions)
      local artifact_id="" name="" json_mode="false"
      # First positional arg is artifact_id
      if [[ $# -gt 0 ]] && [[ "$1" != --* ]]; then
        artifact_id="$1"
        shift
      fi
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --change) name="$2"; shift 2 ;;
          --json) json_mode="true"; shift ;;
          *) die "Unknown option: $1" ;;
        esac
      done
      if [[ -z "$artifact_id" ]] || [[ -z "$name" ]]; then
        die "Usage: opsx-cli.sh instructions <artifact-id> --change <name> [--json]"
      fi
      cmd_instructions "$artifact_id" "$name" "$json_mode"
      ;;
    list)
      local json_mode="false"
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --json) json_mode="true"; shift ;;
          *) die "Unknown option: $1" ;;
        esac
      done
      cmd_list "$json_mode"
      ;;
    *)
      die "Unknown command: ${cmd}. Available: new, status, instructions, list"
      ;;
  esac
}

main "$@"
