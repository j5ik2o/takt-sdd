# Brief: kiro-spec-generation-workflows

## Problem

Kiro-style SDD では、requirements、design、tasks の順に artifact を生成し、approval 状態を更新する必要があります。これを長い skill 手順として agent に読ませるだけでは、phase 更新、承認状態、gap context、task boundary が実行ごとにぶれやすくなります。

## Current State

OpenSpec change では、`kiro-spec-init`、`kiro-spec-requirements`、`kiro-spec-design`、`kiro-spec-tasks`、`kiro-spec-quick` を TAKT workflow として実装する計画があります。`.kiro/specs/<feature>/spec.json` と Markdown artifact は Kiro-compatible に維持する方針です。

## Desired Outcome

Kiro spec の初期化、requirements 更新、design/research 生成、tasks 生成、quick path が、TAKT workflow から一貫して実行できます。各 phase は `spec.json` の状態と approval を正しく扱い、次 phase へ進む条件を明確にします。

## Approach

spec generation 系 workflow を、共通 `.kiro/*` 操作規約と output contract の上に実装します。`kiro-spec-quick` は個別 workflow の安全な composition として扱い、approval behavior を曖昧にしません。

## Scope

- **In**: `kiro-spec-init`、`kiro-spec-requirements`、`kiro-spec-design`、`kiro-spec-tasks`、`kiro-spec-quick`、`spec.json` の phase/approval 更新、`requirements.md`、`design.md`、`research.md`、`tasks.md` の生成規約
- **Out**: multi-spec roadmap の dependency wave 実行、implementation task の実行、review/debug/verify sub-workflow

## Boundary Candidates

- feature spec directory と `spec.json` lifecycle
- requirements/design/tasks の phase-gated generation
- gap context と research artifact の受け渡し
- quick path の approval behavior

## Out of Boundary

- `kiro-discovery` の single/multi/mixed routing
- `kiro-spec-batch` の cross-spec orchestration
- code edit を伴う `kiro-impl`

## Upstream / Downstream

- **Upstream**: `kiro-shared-workflow-contracts`
- **Downstream**: `kiro-discovery-batch-workflows`、`kiro-iterative-implementation-workflow`

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: `.kiro/steering/roadmap.md` は batch/discovery 側が所有し、この spec は個別 feature spec の lifecycle に集中します。

## Constraints

生成する Markdown は、日本人が自然に読める日本語で書きます。requirements などで機械的な判定が必要な箇所は、日本語本文の中でも必要な構造を保ちます。
