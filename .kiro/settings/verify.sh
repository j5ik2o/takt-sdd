#!/usr/bin/env sh
# Optional repo verification hook for kiro-impl deterministic quality gates.
# The kiro-impl workflow gate runs: `sh .kiro/settings/verify.sh` when this file is present;
# if absent the gate is a logged no-op (exit 0).
# Exit 0 = task verification passed; non-zero = failed (blocks task completion).
# IMMUTABLE during kiro-impl runs: implementation tasks MUST NOT edit this file;
# treat it as out-of-boundary. Reviewers/scope-guard reject task diffs that touch it.

set -e

echo "[kiro-impl verify] Starting deterministic verification for takt-sdd..."

npm run --silent validate:kiro-iterative-implementation-workflow
npm run --silent validate:kiro-ai-quality-gate-workflow-coverage

echo "[kiro-impl verify] PASS: all deterministic validators exited 0."
