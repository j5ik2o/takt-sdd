# 要件定義

## はじめに

`kiro-impl-verification-hardening` は、既存 `kiro-iterative-implementation-workflow` を Extends し、kiro-impl の autonomous loop における「検証証跡の厳格化」と「実行規律」を強化する spec です。

TAKT の各 step は fresh な別 agent instance で実行されるため、現状を「同一 coder の自己承認」とみなすのは不正確である。残る課題は、タスク完了の可否が「coder が記録した validation evidence を別 agent（reviewers / verify-task-completion）が読む」agent-reported evidence chain に依存している点である。これにより、(1) 実行されていない、または stale な検証証跡の見落とし、(2) 証拠不十分なままの合意収束、(3) 既定 auto-commit の粗いコミット粒度、(4) Implementation Notes の暗黙伝播、という課題がある。

本 spec はコア4提案（提案1: READY 経路の明示検証 / 提案2: アドバーサリアル・レビュー純化 / 提案3: タスク単位コミット粒度 / 提案4: 知識伝播の明示化）を要件化する。挙動の source of truth は kiro-impl skill 定義に置き、facet は adapter delta のみとする。TAKT 0.45.0 の制約（command `quality_gates` は agent completion 後に無条件実行される）を踏まえ、`BLOCKED` / `NEEDS_CONTEXT` ルーティングを阻害する無条件 command gate は使わない。

## 境界コンテキスト

- **対象範囲**: 提案1（READY_FOR_REVIEW 経路の明示検証と検証証跡の厳格化）、提案2（4観点 reviewer のアドバーサリアル純化）、提案3（検証済みタスク単位のコミット粒度と選択的ステージング）、提案4（Implementation Notes の明示的読込・追記）、ja/en 両資産の対構造維持、対応する validate スクリプト・node:test の更新、挙動変更の kiro-impl skill 定義への反映。
- **対象外**: 提案5（リスク階層化 / model 階層化。takt 0.45.0 は parallel サブステップの条件スキップ非対応、かつ常時ゲート追加禁止と要調停）、提案6（loop_monitors threshold の数値調整）、ai-quality-gate サブワークフロー本体の責務再設計、新規 reviewer 観点（security 等）の常時必須化、requirements/design/tasks 生成や batch orchestration。
- **隣接システム／スペックへの期待**: `kiro-iterative-implementation-workflow` の既存フロー（readiness → one-task selection → 実行 → AI antipattern gate → 複数観点レビュー → 完了検証 → progress 更新）を基盤として参照し、その内部責務を吸収しない。`kiro-ai-quality-gate` サブワークフローの本体設計は変更しない。`kiro-shared-workflow-contracts` の review verdict / completion / artifact policy contract は消費する。TAKT 0.45.0 engine の `allow_git_commit`・`loop_monitors` を利用し、command `quality_gates` は無条件実行の制約により本 spec の execute/debug 分岐には使わない。

## 要件

### 要件 1: READY 経路の検証証跡を厳格化する

**目的:** 実装者として、選択タスクの機械的正しさ（テスト緑・ビルド成功）が、実行済みコマンド・終了コード・fresh output で証跡化された状態だけを review へ進めたい。そうすることで、hallucination や stale evidence による誤った完了判定を防げる。

#### 受け入れ基準

1. `execute-task` は、task-local validation commands を実行し、その command、exit code、fresh output を `validation_evidence` に記録できた場合だけ `STATUS: READY_FOR_REVIEW` を返さなければならない。
2. validation が失敗した、または実行に必要な context が不足する場合、`execute-task` は `STATUS: BLOCKED` または `STATUS: NEEDS_CONTEXT` を返し、workflow rules が `debug-task` へルーティングできなければならない。
3. `execute-task` と `ai-antipattern-fix` は、`STATUS BLOCKED` / `STATUS NEEDS_CONTEXT` / `STATUS NEED_REPLAN` 経路を阻害する無条件 command `quality_gates` を持ってはならない。
4. skill autonomous mode では、implementer が `READY_FOR_REVIEW` を返した後、parent が reviewer dispatch 前に `.kiro/settings/verify.sh` を存在時のみ実行し、非ゼロの場合は review へ進めてはならない。
5. 選択タスクの検証コマンドをリポジトリから解決できない場合、Kiro 実装ワークフローはそのタスクを完了済みにせず、検証コマンド未解決を欠落証跡として返さなければならない。

### 要件 2: 再実行制御を loop_monitors に一本化したまま検証ゲートを統合する

**目的:** maintainer として、検証証跡の厳格化後も再実行制御が `loop_monitors` のみで表現される状態を保ちたい。そうすることで、独自リトライ機構の二重化や無限ループを防げる。

#### 受け入れ基準

1. 実装時の validation 失敗、レビュー失敗、完了検証失敗が併存する場合、Kiro 実装ワークフローは `BLOCKED` / `NEEDS_CONTEXT` / review findings / completion findings を区別し、重複するリトライループを作ってはならない。
2. Kiro 実装ワークフローは常に、実装／デバッグ／レビューの再実行上限を `loop_monitors.threshold` だけで表現し、facet・validator・frontmatter に独自リトライカウンタや独自ループ健全性管理を持ってはならない。
3. `loop_monitors` が非生産的ループと判定した場合、Kiro 実装ワークフローは追加実装へ戻らず、選択タスクの blocker note または人間確認相当の停止結果へ分岐しなければならない。

### 要件 3: アドバーサリアルな複数観点レビューで合意収束バイアスを抑止する

**目的:** reviewer として、各観点レビューが証拠に基づく不同意を既定とし、証拠がそろう場合だけ承認したい。そうすることで、証拠不十分なまま承認へ収束する false-consensus を防げる。

#### 受け入れ基準

1. 完了候補に対して複数観点レビューを実行するとき、各観点 reviewer（coding / architecture / qa / testing）は既定の判定を却下とし、選択タスク・要件・境界・実 diff の証拠を引用できる場合に限り承認しなければならない。
2. coding review は、緑証跡の存在、コード正当性、タスク境界、実 diff、検証証跡の判断に集中しなければならない。
3. すべての reviewer 結果が承認相当である場合に限り、Kiro 実装ワークフローは完了検証へ進まなければならない。
4. いずれかの reviewer 結果が要修正／却下相当である場合、Kiro 実装ワークフローは完了検証へ進まず、対象観点・actionable findings・関連 task/requirement/design 参照を debug 判断へ渡さなければならない。
5. Kiro 実装ワークフローは security 専用 reviewer をこの feature の常時必須ゲートに追加してはならない。
6. Kiro 実装ワークフローは coding / architecture / qa / testing レビュー結果を相互に区別できる機械可読証跡として保持しなければならない。

### 要件 4: タスク単位のコミット粒度と選択的ステージングを確保する

**目的:** maintainer として、検証済みタスクごとにコミットが作られ、変更が選択タスクの範囲に限定された状態を保ちたい。そうすることで、bisect・rollback・中断後の再開が確実になる。

#### 受け入れ基準

1. 完了検証が VERIFIED かつ progress 更新が完了したとき、Kiro 実装ワークフローは選択タスク単位のコミットを作成しなければならない。
2. タスク単位のコミットを作成するとき、Kiro 実装ワークフローは implementation report の `changed_files`、current AI antipattern fix report が存在する場合はその `changed_files`、および選択中 spec の `.kiro/specs/<feature>/tasks.md` だけを対象とし、無関係な `baseline_dirty_files` を巻き込んではならない。
3. 完了検証が VERIFIED でない場合、Kiro 実装ワークフローはそのタスクのコミットを作成してはならない。
4. ワークフローランタイムが既定で一括自動コミットを行う場合、Kiro 実装ワークフローはタスク単位コミットとの粒度の重複を調停し、コミット履歴がタスク境界と一致する状態を保たなければならない。

### 要件 5: タスク間の学びを明示的に伝播する

**目的:** 実装者として、先行タスクで得た横断的な学び（Implementation Notes）を後続タスクの実装・デバッグで確実に活用したい。そうすることで、同じ失敗の再発を防げる。

#### 受け入れ基準

1. 選択タスクの実装を開始するとき、Kiro 実装ワークフローは `tasks.md` の Implementation Notes のうち、選択タスクの境界・依存に関連する項目を読み込まなければならない。
2. デバッグ判断を行うとき、Kiro 実装ワークフローは関連する Implementation Notes を root cause 分析と修正計画の入力として参照しなければならない。
3. タスク実行が横断的な学びを新たに得た場合、Kiro 実装ワークフローは `tasks.md` の Implementation Notes に簡潔な一行として記録しなければならない。
4. Kiro 実装ワークフローは Implementation Notes の参照・追記を選択タスクまたは共有 notes セクションの範囲に限定し、無関係な記述を変更してはならない。

### 要件 6: 言語ペア・検証資産・skill source of truth の整合を保つ

**目的:** maintainer として、本 feature の変更が ja/en 両資産・検証スクリプト・skill source of truth に一貫して反映された状態を保ちたい。そうすることで、言語ドリフトや契約ドリフトによる退行を防げる。

#### 受け入れ基準

1. 本 feature がワークフロー YAML または facet を変更するとき、Kiro 実装ワークフローは `.takt/ja` と `.takt/en` の対応資産を構造的に揃った状態で更新しなければならない。
2. 本 feature が機械チェック可能なワークフロー契約（無条件 command gate 禁止・reviewer 振る舞い・コミット粒度・知識伝播・loop_monitors 単一原則）を追加または変更するとき、実装ワークフロー検証は対応する validate スクリプトと node:test でそれを検証しなければならない。
3. 本 feature がワークフローの挙動を変更するとき、Kiro 実装ワークフローは挙動の source of truth である kiro-impl skill 定義を更新し、facet には adapter delta（input artifacts・output fields・rule condition・artifact write boundary）だけを記述しなければならない。
4. Kiro-specific facet が TAKT built-in facet を継承できる場合、実装ワークフロー検証は共有 `BuiltinFacetInheritancePolicy` に従い差分だけが記述されていることを検証しなければならない。
5. 実装ワークフロー検証は、本 feature が spec 生成・roadmap batch orchestration・status/validation workflow の責務を参照していないことを境界違反として検出しなければならない。
