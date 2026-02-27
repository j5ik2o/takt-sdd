#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck disable=SC2155
export TAKT_CODEX_CLI_PATH=$(which codex)
export CODEX_HOME=${SCRIPT_DIR}/../../.codex

cd "${SCRIPT_DIR}"

exec takt "$@"
