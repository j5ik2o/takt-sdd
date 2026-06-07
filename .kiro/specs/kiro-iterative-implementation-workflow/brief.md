# Brief: kiro-iterative-implementation-workflow

## Problem

`kiro-impl` は実コードを編集するため、spec boundary を超えた変更、未検証の checkbox 更新、review/debug の引き継ぎ漏れが起きると影響が大きくなります。長い prompt 手順として agent に任せるだけでは、1 task per iteration、失敗時の判断、完了判定が安定しません。

## Current State

OpenSpec change では、`kiro-impl` を planning、one-task execution、internal review、debug、completion verification、checkbox update の gate を持つ TAKT workflow として実装する方針です。`kiro-review`、`kiro-debug`、`kiro-verify-completion` は internal sub-workflow として扱います。

## Desired Outcome

`kiro-impl` が `.kiro/specs/<feature>/tasks.md` から実行可能な 1 タスクを選び、境界、依存、検証コマンド、feature flag の前提を明示して実行します。review、debug、completion verification が通るまで task checkbox は更新せず、失敗時は RETRY_TASK、BLOCK_TASK、STOP_FOR_HUMAN のような明示的 decision で分岐します。再実行ループの健全性と打ち切りは TAKT runtime の `loop_monitors` を source of truth にし、facet や validator に独自 retry counter / loop-health 管理を持たせません。

## Approach

implementation workflow は最後の段階で実装します。先行 spec で固めた status/validation、spec generation、共通 output contract を利用し、code edit を伴う箇所だけに責務を絞ります。

## Scope

- **In**: `kiro-impl` planning、one-task execution、task boundary/dependency/validation guidance、`kiro-review`、`kiro-debug`、`kiro-verify-completion`、checkbox 更新、blocker notes、implementation notes
- **Out**: requirements/design/tasks の生成、roadmap batch generation、major-version public surface の説明

## Boundary Candidates

- eligible task selection と one-task iteration
- task execution の boundary と validation evidence
- internal review/debug/verify sub-workflow
- completion gate 後の `tasks.md` 更新

## Out of Boundary

- spec 作成 phase の approval workflow
- discovery の action path 判定
- `kiro:*` script namespace の移行説明

## Upstream / Downstream

- **Upstream**: `kiro-status-validation-workflows`、`kiro-spec-generation-workflows`、`kiro-shared-workflow-contracts`
- **Downstream**: Kiro spec に基づく実装作業、PR monitoring、CI/review 対応

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: `kiro-status-validation-workflows` の readiness signal と、`kiro-spec-generation-workflows` が生成する `tasks.md` に依存します。

## Constraints

実装 workflow は、spec boundary を超える変更を避けます。完了扱いにする前に、テストや build などの現在の evidence を確認し、確認できないものは未確認として残します。文書と実行レポートは日本語で書きます。
