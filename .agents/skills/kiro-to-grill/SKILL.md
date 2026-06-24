---
name: kiro-to-grill
description: >
  Kiro / SDD の spec から未登録のユビキタス言語、canonical term、
  avoid term、不変条件、境界名、契約名、ADR 候補となる仕様変更を検出し、
  domain-modeling / grill-with-docs で確定してから CONTEXT.md と docs/adr/*
  に反映するスキル。ユーザーが「.kiro/specs を見て未定義語を拾って」、
  「Kiro spec から CONTEXT.md を更新して」、「spec の仕様変更を ADR に反映」、
  「glossary gap を埋めて」、「ユビキタス言語を逆引きして」などを依頼した
  場合に使う。単なる spec status 確認、requirements/design/tasks の生成、
  実装、または Kiro に渡す前の要求整理には使わない。
---

# Kiro to Grill

Kiro spec に固定された言葉や設計判断を、domain docs へ戻すための reconciliation skill。

## 目的

Kiro spec は feature-level の requirements / design / tasks を持つが、ユビキタス言語や不可逆な設計判断の正本ではない。このスキルでは、Kiro spec から domain docs に戻すべき差分を見つけ、`CONTEXT.md` と `docs/adr/*` に反映する。

- `CONTEXT.md`: domain terminology、canonical term、avoid term、invariant だけを残す
- `docs/adr/*`: 不可逆・非自明・trade-off を伴う設計判断だけを残す
- `.kiro/specs/**`: 反映元として読む。ユーザーが明示しない限り、このスキルでは編集しない

## 入口判断

このスキルを使うのは、Kiro spec が先にあり、その内容を domain docs に戻したいとき。

- `.kiro/specs/**` から未登録のユビキタス言語を探したい
- spec 内の境界名、契約名、不変条件を `CONTEXT.md` と照合したい
- requirements / design / tasks の変更から ADR 候補を見つけたい
- spec と `CONTEXT.md` / `docs/adr/*` の矛盾を洗い出したい
- Kiro spec 由来の glossary gap を `domain-modeling` / `grill-with-docs` 経由で解消したい

使わないケース:

- 新しい要求を Kiro に渡す前に煮詰めたい場合。代わりに `grill-to-kiro` を使う
- requirements / design / tasks を生成・更新したいだけの場合
- 実装タスクを進めたいだけの場合
- spec status を確認したいだけの場合

## 手順

### 1. 対象 spec と context docs を特定する

対象 spec は、次の順で決める。

1. ユーザーが feature 名や path を指定していれば、それだけを対象にする。
2. git diff に `.kiro/specs/**` の変更があれば、変更された spec を優先する。
3. ユーザーが「全部」「全体」と言っていれば `.kiro/specs/**` 全体を見る。
4. それ以外は、対象を広げる前に確認する。

`AGENTS.md` / `CLAUDE.md` の `Project Context Sources` に従い、存在するものだけ確認する。

- `CONTEXT.md`, `CONTEXT-MAP.md`
- `docs/adr/`
- `.kiro/steering/`
- `.kiro/specs/<feature>/{brief.md,requirements.md,research.md,design.md,tasks.md,spec.json}`
- `openspec/**` は public contract の照合が必要な場合だけ読む

存在しない context docs は未作成として扱う。未作成を理由に止まらない。

### 2. Kiro spec から候補を抽出する

spec ごとに、domain docs に戻す候補を分類する。

**Domain terminology 候補**
- ドメイン概念、役割、状態、イベント、境界名
- feature をまたいで使われる契約名、public contract 名
- requirements / design で不変条件として扱われている制約
- spec の `Out of Boundary` や `Boundary Commitments` を理解するために必要な語

**Avoid term 候補**
- spec 内で曖昧に使われている語
- 既存 `CONTEXT.md` の avoid terms と衝突する語
- 同じ概念を複数表記している語

**ADR 候補**
- 後から変更するコストが高い設計判断
- 未来の読者が理由を知りたくなる非自明な判断
- 代替案があり、trade-off を伴う判断
- data ownership、dependency direction、public contract、storage model、consistency model、boundary split の変更

**除外するもの**
- ファイル名、関数名、型名だけの implementation detail
- 一時的な task label、作業メモ、チェックリスト項目
- 一般的な技術語
- spec 内だけで閉じる局所的な表現

### 3. 既存 docs と照合する

候補ごとに次を判断する。

- `registered`: 既に `CONTEXT.md` / ADR にある
- `missing`: domain docs に戻すべきだが未登録
- `conflict`: spec と domain docs の定義・表記・判断が矛盾している
- `needs_grill`: 意味が曖昧で、反映前に `domain-modeling` / `grill-with-docs` が必要
- `ignore`: domain docs に戻すべきではない

`CONTEXT.md` が未作成の場合でも、すべてを自動登録しない。domain boundary を表す語だけを候補にする。

### 4. Kiro to Grill Report を出す

編集前に、短い report を作る。

```md
## Kiro to Grill Report

### Sources
- Specs: [...]
- Domain docs: [...]

### CONTEXT.md candidates
| Term | Source | Classification | Action |
|------|--------|----------------|--------|

### ADR candidates
| Decision | Source | Why ADR | Action |
|----------|--------|---------|--------|

### Conflicts
- [...]

### Ignored
- [...]
```

`needs_grill` や `conflict` がある場合は、`domain-modeling` / `grill-with-docs` の質問を一つずつ行い、意味を確定してから編集する。

### 5. CONTEXT.md と ADR に反映する

反映時は `domain-modeling` の責務に従う。

`CONTEXT.md`:
- 既存ファイルがあれば、その見出し・書式・用語表の粒度に合わせる。
- 未作成なら、最初に確定した domain terminology がある時点で作る。
- glossary として書く。spec、作業計画、実装詳細を混ぜない。
- canonical term / avoid term / invariant を明確に分ける。

`docs/adr/*`:
- 既存 ADR の採番・書式に合わせる。
- 未作成なら、最初の ADR が必要になった時点で `docs/adr/` を作る。
- ADR は、不可逆・非自明・trade-off の3条件を満たす場合だけ作る。
- spec の全変更履歴や task の台帳として ADR を作らない。

矛盾がある場合は、黙って `CONTEXT.md` や ADR を上書きしない。ユーザーに確認し、どちらを正本にするか決めてから反映する。

### 6. 反映後に検証する

反映後、次を確認する。

- `CONTEXT.md` に implementation detail が混ざっていない
- ADR が spec 台帳になっていない
- spec 内の用語と `CONTEXT.md` の canonical term が矛盾していない
- 追加した ADR が既存 ADR と矛盾していない
- `git diff --check` が通る

## 出力

最後に次を短く報告する。

- 読んだ Kiro spec
- 追加・更新した `CONTEXT.md` の用語
- 作成・更新した ADR
- 残した未解決の確認事項
- 実行した検証

## 禁止事項

- 絶対に実装作業しない。
- spec 内の語を機械的に全部 `CONTEXT.md` へ追加しない。
- `CONTEXT.md` に spec 本文、task、implementation detail を入れない。
- ADR を spec 差分の履歴台帳として作らない。
- 矛盾する既存 ADR を黙って上書きしない。
- ユーザーが明示しない限り `.kiro/specs/**` を編集しない。
