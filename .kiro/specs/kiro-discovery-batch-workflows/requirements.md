# Requirements Document

## Introduction

`kiro-discovery-batch-workflows` は、Kiro-style SDD の入口である `kiro-discovery` と、複数 spec を依存順に生成する `kiro-spec-batch` を TAKT workflow として定義する spec です。新しい作業が既存 spec 更新、direct implementation、single spec、multi-spec、mixed decomposition のどれに進むべきかを artifact として残し、multi-spec の場合は roadmap dependency wave と cross-spec review を通して後続 spec の境界ずれを検出します。

この spec は、上流の `kiro-spec-generation-workflows` が提供する個別 spec artifact 生成 workflow を呼び出す orchestration を扱います。requirements/design/tasks の本文生成そのもの、`kiro-impl` による code edit、個別 validation workflow の shared verdict 判定は扱いません。

## Boundary Context

- **In scope**: `kiro-discovery` の action path routing、`brief.md` と `.kiro/steering/roadmap.md` の作成方針、`kiro-spec-batch` の roadmap dependency order 解析、dependency wave execution、parallel worker dispatch、cross-spec review、batch completion summary、discovery/batch workflow validation
- **Out of scope**: 個別 feature spec の requirements/design/tasks 本文生成、`kiro-spec-init` から `kiro-spec-tasks` までの standalone phase 実装、`kiro-impl` の task selection と code edit、package script migration、OpenSpec artifact model との統合
- **Adjacent expectations**: `kiro-shared-workflow-contracts` は `.kiro/*` artifact 操作と lifecycle contract を提供し、`kiro-spec-generation-workflows` は個別 spec の生成 workflow を提供する。この spec はそれらを利用して routing と orchestration を実行する。

## Requirements

### Requirement 1: discovery workflow が action path を判定できる

**Objective:** spec 作成者として、新しい作業の入口で適切な進め方を判断したい。そうすることで、single spec、multi-spec、既存 spec 更新、direct implementation を誤って混ぜずに開始できる。

#### Acceptance Criteria

1. `kiro-discovery` が作業説明を受け取る場合、discovery batch workflows は existing spec update、direct implementation、single spec、multi-spec、mixed decomposition の候補を判定できる。
2. action path が single spec、multi-spec、または mixed decomposition である場合、discovery batch workflows は 後続 workflow が読める `brief.md` を対象 feature directory に作成できる。
3. action path が multi-spec または mixed decomposition である場合、discovery batch workflows は `.kiro/steering/roadmap.md` に dependency order と scope boundary を残せる。
4. 作業内容が既存 spec 更新または direct implementation と判断される場合、discovery batch workflows は 新規 spec generation を開始せず、利用者に次の action を示す。
5. discovery batch workflows は discovery output の日本語本文を自然な日本語にし、JSON key、path、script 名、enum 値は machine-readable な表記を維持する。

### Requirement 2: discovery artifact が後続 workflow の source of truth になる

**Objective:** 後続 workflow 実装者として、discovery の判断理由と境界をファイルから再利用したい。そうすることで、後続 phase が会話履歴や自由文推測に依存せず同じ前提で動ける。

#### Acceptance Criteria

1. discovery が `brief.md` を作成する場合、discovery batch workflows は problem、current state、desired outcome、approach、scope、boundary candidates、out of boundary、upstream/downstream を含める。
2. discovery が roadmap を作成または更新する場合、discovery batch workflows は `## Specs (dependency order)` に feature、説明、dependencies、completion status を記録する。
3. roadmap includes `## Existing Spec Updates` or `## Direct Implementation Candidates`場合、discovery batch workflows は それらを batch execution の対象ではなく awareness-only item として表現する。
4. `brief.md` と roadmap の dependency または boundary が矛盾する場合、discovery batch workflows は batch execution に進まず、矛盾箇所を利用者へ示す。
5. discovery batch workflows は OpenSpec artifacts を `.kiro/*` discovery artifact の source of truth に混ぜない。

### Requirement 3: batch workflow が roadmap dependency wave を実行できる

**Objective:** maintainer として、複数 spec を依存順に生成したい。そうすることで、上流 contract がない状態で下流 spec を作って interface mismatch を起こすことを避けられる。

#### Acceptance Criteria

1. `kiro-spec-batch` が実行される場合、discovery batch workflows は `.kiro/steering/roadmap.md` の `## Specs (dependency order)` だけを batch 対象として解析する。
2. pending specs are parsed場合、discovery batch workflows は dependencies がすべて完了済みまたは先行 wave に属する feature を同じ wave に分類する。
3. roadmap に circular dependency または missing dependency がある場合、discovery batch workflows は spec generation を開始せず、問題の dependency を報告する。
4. pending feature の `brief.md` が存在しない場合、discovery batch workflows は missing brief の feature 名を報告し、discovery の再実行を促す。
5. wave execution の実行中、discovery batch workflows は同じ wave の feature を互いに独立した worker として扱い、前 wave が完了するまで次 wave を開始しない。

### Requirement 4: batch workflow が個別 spec generation と境界を分離する

**Objective:** workflow 実装者として、batch controller と個別 spec 生成の責務を分けたい。そうすることで、generation logic の重複と lifecycle drift を防げる。

#### Acceptance Criteria

1. batch worker が feature spec を作成する場合、discovery batch workflows は `kiro-spec-generation-workflows` の init、requirements、design、tasks phase を利用する。
2. auto-approve mode が batch で使われる場合、discovery batch workflows は worker-local な requirements、design、tasks の generated/approved state と `ready_for_implementation` を shared lifecycle contract に合わせるが、batch-level readiness は cross-spec review と remediation gate が完了するまで確定しない。
3. discovery batch workflows は requirements/design/tasks の本文生成 rules、EARS rules、design synthesis、task graph review の所有を `kiro-spec-generation-workflows` から奪わない。
4. individual spec generation が `BLOCKED` または `NEEDS_FIX` を返す場合、discovery batch workflows は 同じ wave の他 feature の結果を保持し、該当 feature の failure と next action を報告する。
5. discovery batch workflows は code edit implementation と task checkbox progress update を batch completion の成功条件に含めない。

### Requirement 5: cross-spec review が責務重複と contract mismatch を検出できる

**Objective:** reviewer と maintainer として、複数 spec の生成後に境界と contract のずれを検出したい。そうすることで、後続 implementation が重複 ownership や不整合な interface を前提に進むことを防げる。

#### Acceptance Criteria

1. all planned waves complete or partially complete場合、discovery batch workflows は generated specs の `requirements.md`、`design.md`、`tasks.md`、roadmap を対象に cross-spec review を実行する。
2. cross-spec review runs場合、discovery batch workflows は data model consistency、interface alignment、duplicate functionality、dependency completeness、naming conventions、shared infrastructure ownership を確認する。
3. task boundary review runs場合、discovery batch workflows は `tasks.md` の `_Boundary:_` annotation と roadmap dependency が矛盾しないことを確認する。
4. important issue が見つかり、局所修正で解消できる場合、discovery batch workflows は affected spec の修正対象と再 review の必要性を示す。
5. issue が decomposition 問題である場合、discovery batch workflows は local patch で隠さず、roadmap/discovery に戻す必要があることを示す。
6. generated spec が worker-local に `ready_for_implementation: true` を持つ場合でも、cross-spec review と必要な remediation が完了するまで、discovery batch workflows は batch summary と downstream status signal でその spec を implementation-ready として確定しない。

### Requirement 6: discovery/batch workflow の drift を検出できる

**Objective:** maintainer として、discovery/batch workflow と上流 contract のずれを release 前に検出したい。そうすることで、batch が古い lifecycle、古い workflow 名、壊れた roadmap parser を前提に動くことを防げる。

#### Acceptance Criteria

1. repository validation が実行される場合、discovery batch validation は `kiro-discovery` と `kiro-spec-batch` の workflow/facet/output contract references を検証する。
2. repository validation が実行される場合、discovery batch validation は roadmap dependency parser が `## Specs (dependency order)` と awareness-only section を区別できることを検証する。
3. repository validation が実行される場合、discovery batch validation は batch worker が `kiro-spec-generation-workflows` の supported phase と lifecycle contract を参照していることを検証する。
4. repository validation が実行される場合、discovery batch validation は cross-spec review output が issue severity、affected specs、suggested fix、decomposition return の区別を持つことを検証する。
5. discovery batch validation は `kiro-impl` の code edit behavior と個別 spec artifact 本文生成の full behavior を成功条件に含めない。
6. discovery batch validation は Kiro-specific facet が shared `BuiltinFacetInheritancePolicy` に従い、TAKT built-in facet を継承できるものは差分だけを記述していることを検出する。
