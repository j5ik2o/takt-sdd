# Brief: kiro-status-validation-workflows

## Problem

Kiro-compatible project では、spec の現在 phase、approval 状態、validation 結果を安全に読める workflow が必要です。ここが自由文の報告だけだと、後続の spec generation や implementation が、まだ準備できていない spec を誤って進める可能性があります。

## Current State

OpenSpec change では、`kiro-spec-status`、`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` を TAKT workflow として実装する計画があります。これらは read-only または validation 中心で、code edit を伴う implementation workflow より先に実装しやすい領域です。

## Desired Outcome

`kiro-spec-status` が feature phase、approval、readiness を安定して報告します。`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` は `PASS`、`FAIL`、`NEEDS_FIX`、`BLOCKED` を parseable に返し、後続 workflow が安全に進行可否を判断できる状態にします。

## Approach

共通 output contract を使い、status と validation を独立した TAKT workflow として実装します。まず読み取りと判定に閉じることで、artifact 更新や code edit を伴う workflow より低いリスクで契約を固めます。

## Scope

- **In**: `kiro-spec-status`、`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl`、shared validation result output、task completion と test/build evidence の確認、残る manual verification の明示
- **Out**: requirements/design/tasks の生成、roadmap からの batch 実行、implementation task の実行や checkbox 更新

## Boundary Candidates

- `.kiro/specs/<feature>/spec.json` の phase/approval 読み取り
- requirements/design/tasks と evidence の存在確認
- validation verdict の structured output
- 後続 workflow が参照する readiness signal

## Out of Boundary

- spec artifact の新規作成や更新
- reviewer/debugger sub-workflow の実行
- migration documentation の更新

## Upstream / Downstream

- **Upstream**: `kiro-shared-workflow-contracts`
- **Downstream**: `kiro-iterative-implementation-workflow`、必要に応じて `kiro-spec-generation-workflows`

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: OpenSpec strict validation は別 workflow として維持します。

## Constraints

validation 結果は日本語で説明しつつ、workflow が読める shared validation result contract を崩さない形にします。検証できない項目は成功扱いにせず、manual verification requirement として明示します。
