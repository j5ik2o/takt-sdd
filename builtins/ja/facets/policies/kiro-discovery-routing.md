{extends: research}

# Kiro Discovery Routing Policy

## Scope

この policy は `kiro-discovery` の action path routing だけに使います。利用者の作業依頼を分類し、discovery が停止するべきか、`brief.md` を作るべきか、`.kiro/steering/roadmap.md` を更新するべきか、clarification で止めるべきかを記録します。

## Action Path Enum

- `EXISTING_SPEC_UPDATE`: 依頼が既存 `.kiro/specs/<feature>` の境界に収まる。
- `DIRECT_IMPLEMENTATION`: 新しい spec を必要としない小さな修正、設定変更、refactor、documentation update。
- `SINGLE_SPEC`: 1 つの spec に収まる新しい境界-worthy feature。
- `MULTI_SPEC`: 複数の新規 spec へ分解する必要がある依頼。
- `MIXED_DECOMPOSITION`: 少なくとも 1 つの新規 spec と、既存 spec 更新または direct implementation candidate が混在する依頼。

## Routing Rules

- `EXISTING_SPEC_UPDATE` と `DIRECT_IMPLEMENTATION` は新しい spec generation artifact を書かない。既存 spec 更新または direct implementation の `nextAction` を返す。
- `SINGLE_SPEC`、`MULTI_SPEC`、`MIXED_DECOMPOSITION` は新規 spec candidate ごとに `brief.md` を作る。
- `MULTI_SPEC` と `MIXED_DECOMPOSITION` は `.kiro/steering/roadmap.md` に `## Specs (dependency order)` を作成または更新する。
- `MIXED_DECOMPOSITION` の完了には、既存 spec 更新または direct implementation candidate のために `awarenessOnlyItems non-empty` が必要。
- roadmap の `Existing Spec Updates` と `Direct Implementation Candidates` は awareness-only section として扱い、`kiro-spec-batch` の dependency-wave input にしない。
- action path、dependency、boundary ownership が曖昧な場合は、推測せず `blockingReason` を返して停止する。

## Machine Fields

- `actionPath`: action path enum のいずれか。
- `reason`: machine-readable な routing 理由。
- `createdFiles`: discovery が書いた、または書く予定の repository-relative file。
- `nextAction`: 次に実行すべき command または human action。
- `blockingReason`: routing を安全に続行できない場合に必須。
