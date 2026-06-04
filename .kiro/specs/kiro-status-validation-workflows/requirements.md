# Requirements Document

## Introduction

`kiro-status-validation-workflows` は、Kiro-compatible project の spec 状態と検証結果を、TAKT workflow から安全に読める形で返す spec です。対象は `kiro-spec-status`、`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` に限定し、後続 workflow が自由文の推測ではなく parseable な readiness signal と shared validation verdict で分岐できる状態にします。

この spec は `kiro-shared-workflow-contracts` が定義する status / validation result contract、skill identity、`.kiro/*` artifact 操作規約を前提にします。requirements/design/tasks の生成や implementation task execution は別 spec の責務として残します。

## Boundary Context

- **In scope**: `kiro-spec-status`、`kiro-validate-gap`、`kiro-validate-design`、`kiro-validate-impl` の TAKT workflow、status/readiness 判定、gap/design/impl validation の shared validation output、test/build evidence と manual verification requirement の明示
- **Out of scope**: spec artifact の新規作成や更新、requirements/design/tasks 生成、roadmap batch 実行、implementation task の実行、tasks.md checkbox 更新、review/debug sub-workflow の実行
- **Adjacent expectations**: `kiro-shared-workflow-contracts` の共通 output contract と artifact policy を参照し、`kiro-workflow-surface` の `kiro:*` namespace と矛盾しない workflow 名を使う

## Requirements

### Requirement 1: spec status を安定して報告する

**Objective:** workflow 利用者として、feature の現在 phase、approval、readiness を一貫した形式で確認したい。そうすることで、まだ準備できていない spec を誤って次 phase へ進めずに済む。

#### Acceptance Criteria

1. `kiro-spec-status` が feature 名を受け取る場合、Kiro status workflow は feature の存在、現在 phase、approval 状態、ready-for-implementation 判定を parseable な status contract で返す。
2. feature の `spec.json` が存在しない場合、Kiro status workflow は feature missing を成功扱いにせず、後続 workflow が停止判断に使える error category を返す。
3. phase と必須 artifact の存在が矛盾している場合、Kiro status workflow は lifecycle inconsistency と missing artifact を分けて報告する。
4. Kiro status workflow は status 判定の人間向け説明と workflow rule 用の machine field を分けて出力する。

### Requirement 2: gap validation の shared verdict を返す

**Objective:** spec 実装者として、設計前に current codebase と spec artifact の差分を確認したい。そうすることで、design phase が既存実装を無視したまま進むことを防げる。

#### Acceptance Criteria

1. `kiro-validate-gap` が requirements 済み feature を検証する場合、Kiro gap validation workflow は existing implementation、missing components、integration points、recommended next action を validation result として返す。
2. requirements artifact が存在しない、または requirements phase に到達していない場合、Kiro gap validation workflow は `FAIL` または `BLOCKED` の verdict と不足 artifact を返す。
3. codebase evidence を十分に確認できない場合、Kiro gap validation workflow は 検証不能な項目を `manual_verification_required` として明示し、成功扱いにしない。
4. Kiro gap validation workflow は requirements/design/tasks artifact を生成または更新しない。

### Requirement 3: design validation の shared verdict を返す

**Objective:** reviewer と実装者として、design が requirements と境界に照らして実装可能か確認したい。そうすることで、曖昧な設計や境界漏れを実装前に止められる。

#### Acceptance Criteria

1. `kiro-validate-design` が design 済み feature を検証する場合、Kiro design validation workflow は requirements coverage、Boundary Commitments、File Structure Plan、validation hooks の充足状況を shared validation verdict として返す。
2. design artifact が存在しない、または requirements approval と矛盾している場合、Kiro design validation workflow は `FAIL` または `BLOCKED` verdict と修復すべき lifecycle reason を返す。
3. design が下流 spec の責務を吸収している場合、Kiro design validation workflow は boundary violation を actionable finding として返す。
4. Kiro design validation workflow は design.md を自動修正せず、必要な修正内容を validation result として提示する。

### Requirement 4: implementation validation の shared verdict を返す

**Objective:** maintainer と implementation workflow として、tasks の完了状態、test/build evidence、残る manual verification を実装後に確認したい。そうすることで、完了していない実装を完了扱いにしない。

#### Acceptance Criteria

1. `kiro-validate-impl` が tasks 済み feature を検証する場合、Kiro implementation validation workflow は task completion、required evidence、test/build result、remaining manual verification を shared validation verdict として返す。
2. tasks artifact が存在しない、または ready-for-implementation でない場合、Kiro implementation validation workflow は `FAIL` または `BLOCKED` verdict と不足 state を返す。
3. task checkbox と検証証跡が一致しない場合、Kiro implementation validation workflow は incomplete work と evidence mismatch を分けて報告する。
4. Kiro implementation validation workflow は implementation task を実行せず、tasks.md checkbox を更新しない。

### Requirement 5: validation result を後続 workflow が読める形でそろえる

**Objective:** downstream workflow 実装者として、status と validation の結果を同じ判断語彙で扱いたい。そうすることで、spec generation や implementation workflow の分岐条件を安定させられる。

#### Acceptance Criteria

1. validation workflow が結果を返す場合、Kiro validation workflows は shared validation result contract の verdict、reason、evidence、manual verification field を使う。
2. workflow が継続できる状態を返す場合、Kiro validation workflows は `PASS` の machine verdict と人間向け根拠を両方示す。
3. workflow が継続できない状態を返す場合、Kiro validation workflows は `FAIL`、`NEEDS_FIX`、`BLOCKED` のいずれかで停止理由を分類する。
4. Kiro validation workflows は 検証できていない項目を evidence として扱わず、manual verification requirement として分離する。

### Requirement 6: read-only 境界と上流契約への依存を守る

**Objective:** spec owner と並列 worker として、status/validation workflow の責務を読み取りと判定に閉じたい。そうすることで、artifact 生成や implementation 実行の spec と競合せずに安全に実装できる。

#### Acceptance Criteria

1. Kiro status validation workflows は `.kiro/specs/<feature>/` と `.kiro/steering/` を読み取り対象として扱い、artifact 生成 workflow の出力を上書きしない。
2. shared contract の enum、field name、artifact policy が変わる場合、Kiro status validation workflows は downstream revalidation が必要な依存変更として扱われる。
3. `kiro-spec-generation-workflows` または `kiro-iterative-implementation-workflow` が status/validation result を参照する場合、Kiro status validation workflows は 個別 workflow の内部 task selection や generation prompt を要求しない。
4. Kiro status validation workflows は OpenSpec strict validation workflow を置き換えず、Kiro-compatible `.kiro/*` artifact validation に責務を限定する。
5. Kiro status validation workflows が Kiro-specific instruction facet を追加する場合、workflow は shared `BuiltinFacetInheritancePolicy` に従い、TAKT built-in facet を継承できるものは差分だけを記述する。
