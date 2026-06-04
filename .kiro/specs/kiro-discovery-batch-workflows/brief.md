# Brief: kiro-discovery-batch-workflows

## Problem

新しい作業を始めるとき、既存 spec 更新、direct implementation、single spec、multi-spec、mixed decomposition のどれに進むべきかを誤ると、後続の spec と implementation が大きく歪みます。さらに multi-spec の場合、依存順と境界レビューなしに並列生成すると、重複 ownership や interface mismatch が起きやすくなります。

## Current State

OpenSpec change では、`kiro-discovery` を routing workflow として、`kiro-spec-batch` を roadmap dependency wave を読む controller workflow として実装する計画があります。現時点で `.kiro/steering/roadmap.md` は、この OpenSpec change から Kiro spec に変換するための最初の roadmap として作成されます。

## Desired Outcome

`kiro-discovery` が project metadata と roadmap を読み、作業を正しい action path に振り分けます。`kiro-spec-batch` は `.kiro/steering/roadmap.md` の dependency order に従って pending specs を作成し、cross-spec review で責務重複、interface mismatch、dependency gap、boundary overlap を検出します。

## Approach

discovery と batch を、spec generation workflow の上位 orchestration として扱います。個別 spec artifact の生成は `kiro-spec-generation-workflows` に寄せ、この spec は routing、roadmap、dependency wave、cross-spec review に集中します。

## Scope

- **In**: `kiro-discovery`、`kiro-spec-batch`、single/multi/mixed/existing/direct の action path 判定、`.kiro/steering/roadmap.md` の読み取り、dependency wave execution、cross-spec review
- **Out**: requirements/design/tasks の詳細生成、implementation task execution、個別 validation workflow の shared verdict 判定

## Boundary Candidates

- discovery の action path routing
- roadmap の dependency order と phase 管理
- batch generation の wave controller
- cross-spec boundary review

## Out of Boundary

- 個別 feature spec の requirements/design/tasks 本文生成
- `kiro-impl` の task selection と code edit
- package script migration

## Upstream / Downstream

- **Upstream**: `kiro-spec-generation-workflows`
- **Downstream**: multi-spec project の後続 spec creation と implementation planning

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: `kiro-spec-generation-workflows` が個別 spec lifecycle を所有し、この spec は orchestration を所有します。

## Constraints

discovery の出力と roadmap/brief は、日本人が自然に読める日本語で書きます。長い待機や曖昧な自由文判断に頼らず、ファイルに残る artifact を continuity の source にします。
