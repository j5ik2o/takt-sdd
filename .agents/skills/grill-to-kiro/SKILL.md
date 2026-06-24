---
name: grill-to-kiro
description: >
  Kiro / SDD の新規 spec 作成、kiro-discovery、kiro-spec-init、要件化、
  仕様化、feature brief 作成に進む前に使う入口スキル。ユーザーの要求を
  そのまま kiro-* 系スキルへ渡さず、先に grill-with-docs で用語・境界・
  不可逆な設計判断を詰め、必要に応じて CONTEXT.md と docs/adr/* に残してから
  kiro-discovery または kiro-spec-init へつなぐ。新しい作業の相談、曖昧な
  feature idea、Kiro spec の起票、requirements 化の依頼では、ユーザーが
  明示的に grilling を省略すると言わない限りこのスキルを使うこと。既存
  spec の status 確認、requirements/design/tasks/impl の継続、単純な実装、
  既に十分な brief.md がある作業では使わなくてよい。
---

# Grill to Kiro

`grill-with-docs` でドメイン用語と設計判断を固めてから、Kiro の discovery / spec init に渡すための入口スキル。

## 目的

Kiro は requirements / design / tasks を強く進めるため、入力が曖昧なまま渡ると spec 側に曖昧さが固定される。このスキルでは、Kiro に渡す前に次を明確にする。

- domain terminology: `CONTEXT.md` に残すべき正規用語、避ける語、不変条件
- accepted decisions: `docs/adr/*` に残すべき不可逆・非自明・trade-off を伴う判断
- spec boundary: Kiro spec が所有する範囲、所有しない範囲、隣接 spec / subsystem
- handoff input: `kiro-discovery` または `kiro-spec-init` に渡す、会話だけに依存しない要約

## 入口判断

このスキルを使うのは、要求が Kiro / SDD の入口に近いとき。

- 新しい機能、仕組み、改善案を spec 化したい
- `kiro-discovery` または `kiro-spec-init` に進みたい
- requirements / design / tasks に入る前に要求を固めたい
- `CONTEXT.md` や ADR に残すべき用語・判断がありそう
- ユーザーが「煮詰めてから Kiro」「grill してから spec」のように言っている

使わないケース:

- 既存 spec の status 確認だけをしたい
- 既に承認済みの requirements / design / tasks / implementation を継続するだけ
- 明らかに spec 不要の小さな修正、設定変更、単純なリファクタリング
- ユーザーが明示的に grilling を省略し、直接 Kiro に進めるよう指示している

## 手順

### 1. 既存 context を軽く確認する

`AGENTS.md` / `CLAUDE.md` の `Project Context Sources` に従い、存在するものだけ確認する。存在しないファイルを理由に止まらない。

- `CONTEXT.md`, `CONTEXT-MAP.md`
- `docs/adr/`
- `docs/agents/`
- `.kiro/steering/`
- `.kiro/specs/**`
- `openspec/**`

この段階では、Kiro の成果物を新規作成しない。既存の語彙、ADR、spec boundary を把握するだけに留める。

### 2. grill-with-docs を先に通す

`grill-with-docs` を使い、ユーザーの要求を Kiro に渡せる粒度まで煮詰める。

質問は一度に並べず、境界判断に効く順で一つずつ聞く。コードや既存 docs を読めば答えられることは、ユーザーに聞かずに確認する。

最低限、次を明確にする。

- 誰のどんな問題か
- 現状は何で、何が不足しているか
- 完了後に何が真であればよいか
- Kiro spec が所有する範囲
- Kiro spec が所有しない範囲
- 既存 spec / subsystem / public contract との関係
- 新しく確定した domain term / avoid term / invariant
- ADR 化すべき不可逆・非自明・trade-off を伴う判断の有無

用語が確定したら `CONTEXT.md` に残す。ADR は `domain-modeling` の基準に従い、必要な場合だけ `docs/adr/*` に残す。`CONTEXT.md` は spec や作業計画ではなく glossary として扱う。

### 3. Kiro handoff を作る

Kiro に渡す前に、会話の生ログではなく次の handoff を作る。

```md
## Kiro Handoff

### Problem
[誰が、何に困っているか]

### Current State
[現状と不足]

### Desired Outcome
[完了後に真であるべきこと]

### Scope
- In: [...]
- Out: [...]

### Boundary Candidates
- [...]

### Upstream / Downstream
- Upstream: [...]
- Downstream: [...]

### Domain Context Updates
- CONTEXT.md: [追加・更新した用語。なければ none]
- ADR: [作成・検討した ADR。なければ none]

### Kiro Route
[kiro-discovery | kiro-spec-init | no-spec]
```

この handoff を Kiro の入力にする。ユーザーの最初の要求文をそのまま Kiro に渡さない。

### 4. Kiro へ接続する

handoff に基づいて次のいずれかを選ぶ。

- 境界がまだ探索対象、または multi-scope / mixed decomposition の可能性がある: `$kiro-discovery "<handoff summary>"`
- 単一 spec の境界と feature 名が十分に明確: `$kiro-spec-init "<handoff summary>"`
- spec 不要: Kiro に進まず、直接実装または別 workflow を提案する

`kiro-discovery` が `.kiro/specs/<feature>/brief.md` や `.kiro/steering/roadmap.md` を作る場合は、作成後に読み返して、grill-with-docs で確定した用語・境界・ADR 判断が落ちていないか確認する。

`kiro-spec-init` に進む場合は、既存 `brief.md` があればそれを優先し、なければ handoff を project description として使う。

## 禁止事項

- 絶対に実装作業しない。
- 曖昧な初期要求をそのまま `kiro-discovery` / `kiro-spec-init` に渡さない。
- `CONTEXT.md` に implementation detail、タスク、spec 本文を混ぜない。
- ADR を spec の台帳として作らない。
- `kiro-*` 配布スキル本体をこの workflow のために書き換えない。
- requirements / design / tasks / implementation まで勝手に進めない。ユーザーが明示的に続行を依頼した場合だけ downstream phase に進む。

## 完了条件

このスキルの完了は、次のいずれか。

- `grill-with-docs` の結果を反映した `CONTEXT.md` / `docs/adr/*` と Kiro handoff が揃い、`kiro-discovery` または `kiro-spec-init` へ接続した
- spec 不要と判断し、その理由と次の実装方針を提示した
- 未解決の境界・用語・判断が残り、Kiro に進む前にユーザー判断が必要だと明示した
