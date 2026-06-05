# Requirements Document

## Introduction

`kiro-spec-generation-workflows` は、Kiro-style SDD の個別 feature spec を初期化し、requirements、design、tasks へ段階的に進める TAKT workflow 群を定義する spec です。対象は `kiro-spec-init`、`kiro-spec-requirements`、`kiro-spec-design`、`kiro-spec-tasks`、`kiro-spec-quick` と、`.kiro/specs/<feature>` 配下の `spec.json` lifecycle です。

この spec は、上流の `kiro-shared-workflow-contracts` が定める `.kiro/*` artifact 操作規約、skill identity normalization、`spec.json` phase/approval 更新規約を利用します。discovery や batch orchestration は下流 spec に残し、code edit を伴う implementation task の実行も扱いません。

## Boundary Context

- **In scope**: 個別 feature spec directory の初期化、requirements/design/tasks artifact 生成、`research.md` の設計補助 artifact 生成、phase gate、auto-approve semantics、quick path composition、spec generation workflow の validation
- **Out of scope**: `kiro-discovery` の routing、`kiro-spec-batch` の dependency wave と cross-spec review、`kiro-impl` の task execution、status/validation workflow の full implementation、OpenSpec artifact との統合
- **Adjacent expectations**: `kiro-workflow-surface` は `kiro:*` entrypoint を提供し、`kiro-shared-workflow-contracts` は共通 contract と lifecycle rule を提供する。下流の discovery/batch と implementation workflow は、この spec が生成した spec artifact と lifecycle state を参照する。

## Requirements

### Requirement 1: spec 初期化 workflow を提供する

**Objective:** spec 作成者として、brief または入力説明から Kiro-compatible な feature spec を初期化したい。そうすることで、後続 phase が同じ directory layout と lifecycle state から開始できる。

#### Acceptance Criteria

1. `kiro-spec-init` が feature description または既存 `brief.md` を受け取る場合、spec generation workflows は `.kiro/specs/<feature>/` に `spec.json` と draft `requirements.md` を作成する。
2. discovery が作成した directory に `brief.md` だけが存在する場合、spec generation workflows は その directory を再利用し、別名 feature を作らない。
3. feature name が既存 spec と衝突する場合、spec generation workflows は deterministic な suffix または supported error によって衝突を利用者へ示す。
4. spec generation workflows は 初期化直後の `spec.json` を `phase: "initialized"`、全 approvals false、`ready_for_implementation: false` として扱う。
5. spec generation workflows は OpenSpec change directory や roadmap の更新を spec 初期化の成功条件に含めない。

### Requirement 2: requirements 生成 workflow を提供する

**Objective:** spec 作成者として、brief と steering context から EARS 形式の requirements を生成したい。そうすることで、design と tasks が曖昧な自由文ではなく確認可能な acceptance criteria に基づける。

#### Acceptance Criteria

1. `kiro-spec-requirements` が対象 feature を受け取る場合、spec generation workflows は `brief.md`、既存 draft、存在する steering context、requirements rules を読んで requirements を生成する。
2. requirements acceptance criteria が生成される場合、spec generation workflows は EARS の固定句と numeric requirement IDs を保持する。
3. scope ambiguity または acceptance criteria の検証不能性が残る場合、spec generation workflows は artifact を確定せず、clarification または `BLOCKED` 相当の結果を返す。
4. requirements generation が完了する場合、spec generation workflows は `spec.json` を `phase: "requirements-generated"` と `approvals.requirements.generated: true` に更新する。
5. spec generation workflows は requirements phase で design component、workflow YAML、implementation file の所有を決めない。

### Requirement 3: design と research 生成 workflow を提供する

**Objective:** spec 作成者として、承認済み requirements から実装可能な design と discovery findings を得たい。そうすることで、task generation が boundary と file responsibility を推測せずに進められる。

#### Acceptance Criteria

1. `kiro-spec-design` が対象 feature を受け取る場合、spec generation workflows は requirements approval を確認し、`-y` または auto-approve mode では requirements approval を明示的に更新する。
2. design が生成される場合、spec generation workflows は Boundary Commitments、Allowed Dependencies、Revalidation Triggers、File Structure Plan、Requirements Traceability を含める。
3. discovery findings または synthesis decisions が design に影響する場合、spec generation workflows は `research.md` に背景を記録し、`design.md` には実装判断に必要な結論を残す。
4. requirements と design の間に実質的な gap が見つかる場合、spec generation workflows は design を確定せず、requirements 修正が必要な状態を返す。
5. design generation が完了する場合、spec generation workflows は `spec.json` を `phase: "design-generated"` と `approvals.design.generated: true` に更新する。

### Requirement 4: tasks 生成 workflow を提供する

**Objective:** spec 実装者として、design から小さく実行可能な implementation tasks を得たい。そうすることで、後続の `kiro-impl` が boundary と依存関係を読んで安全に作業できる。

#### Acceptance Criteria

1. `kiro-spec-tasks` が対象 feature を受け取る場合、spec generation workflows は requirements と design の approval を確認し、`-y` または auto-approve mode では両方を明示的に承認済みにする。
2. tasks が生成される場合、spec generation workflows は各 executable task に observable completion detail、numeric requirement coverage、`_Boundary:_`、`_Depends:_` を含める。
3. dependency がない task が生成される場合、spec generation workflows は `_Depends:_ none` を canonical grammar として出力する。
4. parallel-capable tasks が存在する場合、spec generation workflows は `(P)` marker を boundary と dependency graph に基づいて付与する。
5. hidden prerequisite、boundary overlap、または coverage gap が見つかる場合、spec generation workflows は `tasks.md` を確定せず、design または task plan の修正が必要な状態を返す。
6. tasks generation が完了し auto-approve mode が有効である場合、spec generation workflows は `spec.json` を `phase: "tasks-generated"`、tasks approved true、`ready_for_implementation: true` に更新する。

### Requirement 5: quick path は安全な composition として動作する

**Objective:** spec 作成者として、単一 feature の spec 初期化から tasks 生成までを一括実行したい。そうすることで、明示的に fast-track した場合でも phase gate と sanity review を飛ばさずに完了できる。

#### Acceptance Criteria

1. `kiro-spec-quick --auto` が実行される場合、spec generation workflows は init、requirements、design、tasks の順で各 standalone workflow を連続実行する。
2. quick path が interactive mode で実行される場合、spec generation workflows は phase 間で利用者 approval を要求し、承認されない phase へ進まない。
3. quick path が design または tasks phase を呼ぶ場合、spec generation workflows は standalone workflow と同じ auto-approve semantics を使う。
4. quick path の全 phase が完了する場合、spec generation workflows は requirements、design、tasks の lightweight sanity review を実行してから completion を報告する。
5. spec generation workflows は quick path に discovery routing、batch orchestration、implementation execution を含めない。

### Requirement 6: spec generation workflow の drift を検出できる

**Objective:** maintainer として、spec generation workflow、facet、lifecycle 更新、artifact contract のずれを検出したい。そうすることで、下流 workflow が壊れた artifact や未知の phase を前提にしない。

#### Acceptance Criteria

1. repository validation が実行される場合、spec generation validation は `kiro-spec-init`、`kiro-spec-requirements`、`kiro-spec-design`、`kiro-spec-tasks`、`kiro-spec-quick` の workflow/facet references を検証する。
2. repository validation が実行される場合、spec generation validation は `spec.json` lifecycle update expectations が shared `SpecLifecycleStateContract` と矛盾しないことを検証する。
3. repository validation が実行される場合、spec generation validation は generated Markdown に必要な phase-specific sections が出力契約上欠けていないことを検証する。
4. shared contract の enum、field、artifact layout が変更される場合、spec generation validation は spec generation workflow の再検証が必要であることを failure または actionable finding として示す。
5. spec generation validation は discovery/batch workflow や implementation workflow の full behavior を成功条件に含めない。
6. spec generation validation は Kiro-specific facet が shared `BuiltinFacetInheritancePolicy` に従い、TAKT built-in facet を継承できるものは差分だけを記述していることを検出する。
