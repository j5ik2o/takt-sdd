{extends: supervise}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-batch` または `/kiro-spec-batch` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-batch` または `/kiro-spec-batch` の `## Step 2: Build Dependency Waves` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Batch Instruction

## Kiro-specific delta

`$kiro-spec-batch` または `/kiro-spec-batch` を `.kiro/steering/roadmap.md` の dependency-wave controller として実行します。この adapter は roadmap parsing、wave planning、dynamic subagent dispatch、feature result aggregation、generation workflow delegation を TAKT step output に写像します。`kiro-spec-generation-workflows` が所有する requirements/design/tasks generation rules は複製しません。

## Inputs

- `## Specs (dependency order)` を持つ `.kiro/steering/roadmap.md`。
- optional awareness-only sections: `## Existing Spec Updates` と `## Direct Implementation Candidates`。
- spec pending batch feature ごとの `.kiro/specs/<feature>/brief.md`。
- `kiro-spec-generation-workflows` phase contract と lifecycle result fields。

## Wave Planning

- `## Specs (dependency order)` から spec pending entries と skipped spec-ready entries を解析する。
- roadmap の `[x]` は spec ready marker として扱い、implementation completion や `tasks.md` checkbox completion として扱わない。
- strict dependency waves を作る。feature はすべての dependency が spec ready、または earlier wave に属する場合だけ wave に入れる。
- `tasks.md` が存在するだけで skip しない。`spec.json.phase == "tasks-generated"`、requirements/design/tasks approvals、`ready_for_implementation == true`、required artifacts の存在を readiness evidence として確認する。
- missing dependency、circular dependency、missing `brief.md`、unknown readiness marker は worker dispatch 前に報告する。

## Dynamic Worker Dispatch

- `dispatch-wave` step を単一の dynamic subagent dispatch controller として使う。
- same-wave worker へ feature name、description、dependencies、brief path、auto-approve mode、expected generation phases、worker output contract を渡す。
- worker は init、requirements、design、tasks に `kiro-spec-generation-workflows` を使う。`takt -w` の shell 実行、`workflow_call`、別 workflow の再起動は禁止する。
- worker writes は `.kiro/specs/<feature>/` に閉じる。

## Feature Result Aggregation

- worker ごとに `feature`、`status`、`generatedArtifacts`、`blockingReason`、`nextAction` を持つ feature result を返す。
- 同一 wave の success と failure result を保持する。
- current wave のすべての worker result が返るまで later wave を開始しない。
