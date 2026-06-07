# Requirements Document

## Introduction

`kiro-iterative-implementation-workflow` は、承認済み Kiro spec の `tasks.md` を読み、`kiro-impl` が 1 回の iteration で 1 つの実装タスクだけを選択、実行、レビュー、デバッグ、完了検証し、証跡がそろった場合だけ checkbox と実装メモを更新するための TAKT workflow を定義する spec です。

この spec は code edit を伴う implementation phase を扱います。上流の `kiro-shared-workflow-contracts` が定める artifact policy、review/debug/completion output contract、`spec.json` lifecycle を参照し、`kiro-status-validation-workflows` の readiness/validation signal と `kiro-spec-generation-workflows` が生成する task annotation を入力として使います。

## Boundary Context

- **In scope**: `kiro-impl` planning、eligible task selection、one-task execution、task boundary/dependency/validation guidance、`kiro-review` / `kiro-debug` / `kiro-verify-completion` / `kiro-validate-impl` の thin adapter step、completion gate、`tasks.md` checkbox/blocker/implementation notes 更新、implementation workflow validation
- **Out of scope**: requirements/design/tasks の生成、`brief.md` や roadmap の作成・更新、dependency wave batch orchestration、`kiro:*` script namespace や major-version migration の説明、PR monitoring や CI gate の実行
- **Adjacent expectations**: `kiro-spec-generation-workflows` は `_Boundary:_`、`_Depends:_`、numeric requirement coverage を含む tasks を生成し、`kiro-status-validation-workflows` は implementation readiness と post-implementation validation を read-only に返す。`kiro-impl` はそれらを参照するが、生成 workflow や status/validation workflow の内部責務を吸収しない。

## Requirements

### Requirement 1: implementation readiness を確認して開始する

**Objective:** 実装者として、承認済みで実装可能な spec だけを `kiro-impl` の対象にしたい。そうすることで、未完成の spec や不整合な lifecycle を誤って code edit に進めずに済む。

#### Acceptance Criteria

1. `kiro-impl` が feature 名を受け取る場合、Kiro implementation workflow は shared artifact policy と status/readiness signal を使って `spec.json`、`requirements.md`、`design.md`、`tasks.md` の実装可能状態を確認する。
2. feature が存在しない、`ready_for_implementation` が true でない、または status/readiness signal が batch-level readiness 保留（cross-spec review/remediation 未完了または blocking issue 残存）を示す場合、Kiro implementation workflow は code edit を開始せず、`BLOCKED` 相当の machine decision と不足 state を返す。
3. `tasks.md` が task annotation を欠いている場合、Kiro implementation workflow は task execution へ進まず、どの annotation が不足しているかを blocker として返す。
4. Kiro implementation workflow は readiness 確認のために requirements/design/tasks artifact を生成または修正しない。

### Requirement 2: 1 iteration で 1 task だけを選択する

**Objective:** 実装者として、未完了 task の中から今回実行する 1 task を明示したい。そうすることで、spec boundary を超えた広すぎる実装や checkbox 更新漏れを防げる。

#### Acceptance Criteria

1. 未完了 task が存在する場合、Kiro implementation workflow は `_Depends:_`、checkbox 状態、blocker notes、task order を確認して eligible な 1 task を選択する。
2. `_Depends:_ none` を持つ task を読む場合、Kiro implementation workflow は empty dependency set として扱う。
3. multiple tasks が eligible である場合、Kiro implementation workflow は先頭の実行可能 task を選び、同じ iteration で複数 task を実装対象にしない。
4. 未完了 task がすべて dependency 未解決または blocker 付きである場合、Kiro implementation workflow は `STOP_FOR_HUMAN` または `BLOCK_TASK` 相当の decision と理由を返す。
5. Kiro implementation workflow は `kiro-spec-batch` の dependency wave や cross-spec orchestration を task selection の責務に含めない。

### Requirement 3: task boundary と validation plan を実行前に固定する

**Objective:** 実装者として、選択 task の境界、依存、検証方法、feature flag 前提を作業前に確認したい。そうすることで、実装中の scope drift と検証漏れを減らせる。

#### Acceptance Criteria

1. task が選択される場合、Kiro implementation workflow は `_Boundary:_`、`_Depends:_`、numeric requirement coverage、関連 design component を implementation plan として出力する。
2. task が変更を必要とする場合、Kiro implementation workflow は 変更予定範囲、禁止する隣接 scope、必要な validation command または manual verification requirement を明示する。
3. task の boundary が design の Boundary Commitments と矛盾する場合、Kiro implementation workflow は code edit を開始せず、`BLOCK_TASK` 相当の decision を返す。
4. Kiro implementation workflow は feature flag、runtime prerequisite、manual verification が必要な場合に、未確認項目を success evidence として扱わない。

### Requirement 4: 選択 task の実装と証跡収集を行う

**Objective:** 実装者として、選択された 1 task のみを実装し、完了判断に使える証跡を残したい。そうすることで、実装済みと検証済みを区別できる。

#### Acceptance Criteria

1. one-task execution が開始される場合、Kiro implementation workflow は 選択 task の boundary 内で必要な code edit と test update を行う。
2. code edit が完了する場合、Kiro implementation workflow は task の validation plan に沿って test/build/check を実行し、実行コマンド、結果、未確認項目を evidence として記録する。
3. validation command が失敗する場合、Kiro implementation workflow は checkbox を更新せず、失敗 evidence と debug 判断に必要な context を返す。
4. Kiro implementation workflow は 選択 task 外の checkbox、blocker、implementation notes を更新しない。

### Requirement 5: internal review と debug decision で失敗を分岐する

**Objective:** reviewer と実装者として、実装後に独立した review と root-cause-first debug 判断を通したい。そうすることで、未解決の指摘や原因不明の失敗を完了扱いにしない。

#### Acceptance Criteria

1. task implementation と validation plan が成功し、完了候補になる場合、Kiro implementation workflow は `kiro-review` skill の thin adapter step を実行し、`VERDICT: APPROVED | REJECTED` を使って分岐する。
2. review verdict が `REJECTED` である場合、Kiro implementation workflow は actionable findings を対象 task と requirement に結びつけ、修正対象を明示する。
3. validation failure または review finding が修正を必要とする場合、Kiro implementation workflow は `kiro-debug` skill の thin adapter step を使って root cause と `NEXT_ACTION: RETRY_TASK | BLOCK_TASK | STOP_FOR_HUMAN` を返す。
4. Kiro implementation workflow は debug decision が `STOP_FOR_HUMAN` の場合に追加実装を続けず、必要な人間確認事項を blocker として残す。
5. Kiro implementation workflow が implementation/debug/review の再実行ループを持つ場合、workflow は TAKT runtime の `loop_monitors` を使って健全性を監視し、facet や validator 内の独自 retry counter、独自 loop-health 判定、独自 max-attempt 管理で代替しない。
6. `loop_monitors` が非生産的ループと判定する場合、Kiro implementation workflow は追加実装へ戻らず、selected task の blocker note または `STOP_FOR_HUMAN` 相当の停止結果へ分岐する。

### Requirement 6: completion verification が通るまで完了更新しない

**Objective:** maintainer として、task checkbox が実際の実装・レビュー・検証証跡と一致している状態を保ちたい。そうすることで、進捗表示が実態より先行しない。

#### Acceptance Criteria

1. implementation、validation、review が完了候補になる場合、Kiro implementation workflow は `kiro-verify-completion` skill の thin adapter step を実行し、skill-defined completion field を確認する。
2. completion verification が complete state でない場合、Kiro implementation workflow は checkbox を更新せず、remaining work と missing evidence を返す。
3. completion verification が complete state である場合、Kiro implementation workflow は 選択 task の checkbox を `- [x]` に更新し、実装メモと検証証跡を `tasks.md` の該当 task へ追記または更新する。
4. Kiro implementation workflow は review/debug/completion の machine verdict と人間向け summary を混在させず、workflow rule が参照する field を明示する。
5. feature-level completion を判断する場合、Kiro implementation workflow は `kiro-validate-impl` skill の thin adapter step を使い、`DECISION: GO | NO-GO | MANUAL_VERIFY_REQUIRED` を final validation の primary machine field として扱う。

### Requirement 7: workflow drift と境界違反を検出できる

**Objective:** maintainer として、implementation workflow、internal sub-workflow、task progress update の contract drift を検出したい。そうすることで、code edit workflow の安全性が後続変更で崩れた場合に早期に気づける。

#### Acceptance Criteria

1. repository validation が実行される場合、implementation workflow validation は `kiro-impl`、`kiro-review`、`kiro-debug`、`kiro-verify-completion`、`kiro-validate-impl` の thin adapter facet references と shared contract references を検証する。
2. repository validation が実行される場合、implementation workflow validation は one-task selection、readiness gate、completion-before-checkbox-update の順序が workflow/facet 上で表現されていることを検証する。
3. workflow が spec generation、roadmap batch orchestration、major-version surface の責務を参照している場合、implementation workflow validation は boundary violation として検出する。
4. implementation workflow validation は PR monitoring、CI 上の review thread 対応、OpenSpec workflow の完了判定をこの spec の成功条件に含めない。
5. implementation workflow validation は Kiro-specific facet が shared `BuiltinFacetInheritancePolicy` に従い、TAKT built-in facet を継承できるものは差分だけを記述していることを検出する。
6. implementation workflow validation は `kiro-impl` が implementation/debug/review の再実行経路を持つ場合に workflow YAML の `loop_monitors.threshold` を持つこと、かつ facet、validator、frontmatter に独自 retry counter や独自 loop-health 管理を持たないことを検出する。

### Requirement 8: implementation workflow は Kiro skill 継承 adapter として実装する

**Objective:** workflow 実装者として、`kiro-impl` の autonomous/manual algorithm と関連 review/debug/verification skill を TAKT にコピーせず、thin adapter step として接続したい。そうすることで、Kiro skill 更新時に TAKT 側の保守範囲を mapping に限定できる。

#### Acceptance Criteria

1. implementation instruction facet が Kiro skill の手順を参照する場合、frontmatter に `extends_skill` と `extends_skill_section` を持つ。
2. `kiro-impl` の autonomous loop は `kiro-impl` skill の algorithm section を source of truth とし、実装、review、debug、task reread、final validation の順序を TAKT step に写像する。
3. `kiro-review`、`kiro-debug`、`kiro-verify-completion`、`kiro-validate-impl` は別 workflow を shell や workflow call で起動せず、`kiro-impl.yaml` 内の adapter step として接続する。
4. adapter facet は Kiro skill 本文をコピーせず、input artifacts、output fields、rule condition、artifact write boundary だけを記述する。
5. 既存 unreleased の `kiro-impl` / `kiro-review` / `kiro-debug` / `kiro-verify-completion` workflow/facet がこの shape に合わない場合、implementation workflow validation は削除または再作成を要求する。
