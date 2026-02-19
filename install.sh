#!/usr/bin/env bash
set -euo pipefail

REPO="j5ik2o/takt-sdd"
BRANCH="main"
TARGET_DIR=".takt"

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m==>\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m==>\033[0m %s\n' "$1" >&2; exit 1; }

# --- 前提チェック ---
command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || error "curl または wget が必要です"
command -v tar >/dev/null 2>&1 || error "tar が必要です"

if ! command -v takt >/dev/null 2>&1; then
  warn "takt がインストールされていません。先に takt をインストールしてください: https://github.com/nrslib/takt"
fi

# --- 既存ファイルの確認 ---
if [ -d "$TARGET_DIR/pieces" ]; then
  warn "${TARGET_DIR}/ に既存のピースが見つかりました"
  printf '上書きしますか？ [y/N] '
  read -r answer
  case "$answer" in
    [yY]*) ;;
    *) info "中断しました"; exit 0 ;;
  esac
fi

# --- ダウンロードと展開 ---
info "takt-sdd をダウンロード中 (${REPO}@${BRANCH})..."

TMPDIR_PATH=$(mktemp -d)
trap 'rm -rf "$TMPDIR_PATH"' EXIT

TARBALL_URL="https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$TARBALL_URL" -o "${TMPDIR_PATH}/archive.tar.gz"
else
  wget -q "$TARBALL_URL" -O "${TMPDIR_PATH}/archive.tar.gz"
fi

tar -xzf "${TMPDIR_PATH}/archive.tar.gz" -C "$TMPDIR_PATH"

EXTRACTED_DIR="${TMPDIR_PATH}/takt-sdd-${BRANCH}"

if [ ! -d "${EXTRACTED_DIR}/.takt" ]; then
  error "ダウンロードしたアーカイブに .takt/ が見つかりません"
fi

# --- インストール ---
info "${TARGET_DIR}/ にファセットとピースをインストール中..."

mkdir -p "$TARGET_DIR"

for dir in pieces personas policies instructions knowledge output-contracts; do
  if [ -d "${EXTRACTED_DIR}/.takt/${dir}" ]; then
    rm -rf "${TARGET_DIR:?}/${dir}"
    cp -R "${EXTRACTED_DIR}/.takt/${dir}" "${TARGET_DIR}/${dir}"
  fi
done

# .gitignore のコピー
if [ -f "${EXTRACTED_DIR}/.takt/.gitignore" ]; then
  cp "${EXTRACTED_DIR}/.takt/.gitignore" "${TARGET_DIR}/.gitignore"
fi

# --- 完了 ---
info "インストール完了"
echo ""
echo "  インストール先: ${TARGET_DIR}/"
echo ""
echo "  使い方:"
echo "    takt -w sdd -t \"要件の説明\""
echo ""
echo "  各フェーズの個別実行:"
echo "    takt -w sdd-requirements -t \"要件の説明\""
echo "    takt -w sdd-design"
echo "    takt -w sdd-tasks"
echo "    takt -w sdd-impl"
echo "    takt -w sdd-validate-impl"
echo ""
