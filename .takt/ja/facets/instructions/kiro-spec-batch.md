---
extends_skill: kiro-spec-batch
extends_skill_section: "## Step 2: Build Dependency Waves"
---

{extends: supervise}

# Kiro Spec Batch Instruction

## Kiro-specific delta

`kiro-spec-batch` を `.kiro/steering/roadmap.md` の dependency-wave controller として実行します。この adapter は roadmap parsing、wave planning、dynamic subagent dispatch、feature result aggregation、generation workflow delegation を TAKT step output に写像します。`kiro-spec-generation-workflows` が所有する requirements/design/tasks generation rules は複製しません。

## Inputs

- `## Specs (dependency order)` を持つ `.kiro/steering/roadmap.md`。
- optional awareness-only sections: `## Existing Spec Updates` と `## Direct Implementation Candidates`。
- pending batch feature ごとの `.kiro/specs/<feature>/brief.md`。
- `kiro-spec-generation-workflows` phase contract と lifecycle result fields。

## Wave Planning

- `## Specs (dependency order)` から pending specs と skipped completed specs を解析する。
- strict dependency waves を作る。feature はすべての dependency が完了済み、または earlier wave に属する場合だけ wave に入れる。
- missing dependency、circular dependency、missing `brief.md`、unknown completion marker は worker dispatch 前に報告する。

## Dynamic Worker Dispatch

- `dispatch-wave` step を単一の dynamic subagent dispatch controller として使う。
- same-wave worker へ feature name、description、dependencies、brief path、auto-approve mode、expected generation phases、worker output contract を渡す。
- worker は init、requirements、design、tasks に `kiro-spec-generation-workflows` を使う。`takt -w` の shell 実行、`workflow_call`、別 workflow の再起動は禁止する。
- worker writes は `.kiro/specs/<feature>/` に閉じる。

## Feature Result Aggregation

- worker ごとに `feature`、`status`、`generatedArtifacts`、`blockingReason`、`nextAction` を持つ feature result を返す。
- 同一 wave の success と failure result を保持する。
- current wave のすべての worker result が返るまで later wave を開始しない。
