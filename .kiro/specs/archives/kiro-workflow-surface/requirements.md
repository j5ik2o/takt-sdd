# Requirements Document

## Introduction

`kiro-workflow-surface` は、takt-sdd の次期メジャーリリースで `kiro:*` を正規の SDD entrypoint として公開するための spec です。利用者、installer、README、agent guidance の見え方をそろえ、旧 `cc-sdd:*` 入口が正規 surface と誤読されない状態にします。

この spec は公開 API と移行説明を扱います。個別 Kiro workflow の YAML/facet 実装、output contract の詳細、`.kiro/specs/*` lifecycle の振る舞いは後続 spec が扱います。

## Boundary Context

- **In scope**: `package.json` と installer が配る npm scripts、major version metadata、README/README.ja/agent guidance の migration 説明、旧 `cc-sdd:*` 入口の fail-fast migration shim
- **Out of scope**: `kiro-spec-status`、`kiro-spec-*`、`kiro-impl` など個別 workflow の中身、TAKT facet/output contract の詳細設計、`.claude/skills` や `.agents/skills` の source asset resolution
- **Adjacent expectations**: `kiro-shared-workflow-contracts` 以降の spec は、この spec が確定した `kiro:*` namespace と breaking-change policy を前提にする。この spec は後続 workflow の中身を実装しないが、公開 entrypoint が未提供 workflow へ無説明に接続されないことを release 前に検証する。

## Requirements

### Requirement 1: `kiro:*` を正規 npm script surface として公開する

**Objective:** takt-sdd の利用者として、npm scripts から迷わず Kiro-compatible workflow を起動したい。そうすることで、旧 `cc-sdd:*` model ではなく新しい TAKT-native Kiro workflow を標準として使える。

#### Acceptance Criteria

1. 利用者が root `package.json` を確認する場合、takt-sdd package は `kiro:*` scripts を SDD workflow の正規入口として表示する。
2. installer が既存 project の `package.json` に scripts を追加する場合、installer は `kiro:*` scripts を追加対象に含める。
3. 新規 project に `package.json` がない状態で installer が実行される場合、installer は `kiro:*` scripts を含む `package.json` を生成する。
4. takt-sdd package は OpenSpec の `opsx:*` scripts を Kiro surface と混同せず、既存の分離された入口として維持する。
5. リリース準備を確認する場合、takt-sdd package は public `kiro:*` scripts が後続 spec または既存 steering 系実装で提供済みであること、または staged migration として明示的な fail-fast 案内を返すことを検出する。

### Requirement 2: 破壊的変更の version policy を package metadata に反映する

**Objective:** package 利用者として、workflow surface の非互換変更を version から判断したい。そうすることで、移行が必要な release であることを事前に把握できる。

#### Acceptance Criteria

1. `kiro:*` surface が正規入口になる場合、takt-sdd package は `package.json` の version を次の major version に更新する。
2. release metadata が読まれる場合、takt-sdd package は description と README の説明から Kiro-compatible TAKT workflow が主 surface であることを示す。
3. takt-sdd package は OpenSpec workflow の継続提供を breaking Kiro surface と別の compatibility として説明する。

### Requirement 3: 旧 `cc-sdd:*` 入口を正規入口として残さない

**Objective:** 既存利用者として、古い script を実行したときに新しい入口へ移行すべきことを明確に知りたい。そうすることで、旧 prompt-driven model に残ったまま作業を続ける事故を避けられる。

#### Acceptance Criteria

1. 利用者が旧 `cc-sdd:*` script を探す場合、takt-sdd package は それらが正規入口ではないことを明確に示す。
2. 旧 `cc-sdd:*` script を互換目的で残す場合、takt-sdd package は 実 workflow を起動せず、対応する `kiro:*` script への移行案内を表示して fail-fast する。
3. 旧 `cc-sdd:*` script を削除する場合、documentation は 削除理由と対応する `kiro:*` script を migration table で示す。
4. takt-sdd package は `cc-sdd:*` を `kiro:*` の透過 alias として扱わない。
5. installer が旧 `cc-sdd:*` shim scripts を導入先 project に追加する場合、導入先 project は `scripts/cc-sdd-migrate.mjs` または同等の package-resolved shim を持ち、module-not-found ではなく移行案内付き fail-fast を返す。

### Requirement 4: README と agent guidance で移行先を一貫して説明する

**Objective:** 人間の利用者と coding agent として、同じ名前、同じ実行例、同じ移行判断を参照したい。そうすることで、ドキュメントと agent 指示のずれによる誤実行を避けられる。

#### Acceptance Criteria

1. 利用者が README を読む場合、documentation は `kiro:*` が canonical SDD workflow であることを最初の Kiro workflow 説明で示す。
2. 日本語利用者が README.ja を読む場合、documentation は 英語 README と同じ migration policy を自然な日本語で示す。
3. agent が `CC-SDD-CODEX.md` または関連 guidance を読む場合、guidance は `$kiro-*` / `kiro:*` を新しい正規 workflow surface として案内する。
4. documentation は 旧 `cc-sdd:*` から `kiro:*` への対応関係を、利用者が command を置き換えられる粒度で示す。

### Requirement 5: 公開 surface の回帰を検証できる

**Objective:** maintainer として、公開 script と migration guidance のずれを release 前に検出したい。そうすることで、Kiro surface の破壊的変更が途中で旧名へ戻る回帰を防げる。

#### Acceptance Criteria

1. 自動検証を実行する場合、validation は root `package.json` と installer の script 定義が同じ canonical `kiro:*` set を持つことを検出する。
2. 自動検証を実行する場合、validation は README/README.ja/agent guidance に旧 `cc-sdd:*` を正規入口として案内する記述が残っていないことを検出する。
3. compatibility shim が採用される場合、validation は shim が対応する `kiro:*` 移行先を表示して非ゼロ終了することを検出する。
4. validation は 個別 workflow の YAML/facet の完成をこの spec の成功条件に含めない。
5. validation は installer が生成または更新した project で legacy shim が module-not-found にならず実行できることを検出する。
6. validation は public `kiro:*` scripts が未提供 workflow の素の missing-file error を利用者へ出さないことを、後続 workflow 実装の存在確認または staged fail-fast 契約として検出する。
