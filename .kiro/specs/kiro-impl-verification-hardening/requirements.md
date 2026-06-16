# 要件定義

## はじめに

`kiro-impl-verification-hardening` は、既存 `kiro-iterative-implementation-workflow` を Extends し、kiro-impl の autonomous loop における「検証の決定論化」と「実行規律」を強化する spec です。

現状、タスク完了の可否は「coder が記録した validation evidence を AI（reviewers / verify-task-completion）が読む」LLM 自己申告の連鎖（既存 Req 4.2）に依存しており、(1) 決定論的グラウンドトゥルース不在による誤 `VERIFIED`、(2) 全会一致レビューの false-consensus、(3) 既定 auto-commit の粗いコミット粒度、(4) Implementation Notes の暗黙伝播、という課題がある。

本 spec はコア4提案（提案1: 決定論的コマンドゲート / 提案2: アドバーサリアル・レビュー純化 / 提案3: タスク単位コミット粒度 / 提案4: 知識伝播の明示化）を要件化する。挙動の source of truth は kiro-impl skill 定義に置き、facet は adapter delta のみとする。takt 0.45.0 のネイティブ機構（`quality_gates` / `allow_git_commit` / `loop_monitors`）へ写像し、ja/en 両資産・validate スクリプト・node:test で検証する。HOW（コマンド解決方式、auto-commit 調停の具体策など）は design フェーズに委ねる。

## 境界コンテキスト

- **対象範囲**: 提案1（コード編集ステップへの決定論的コマンド検証ゲート付与）、提案2（4観点 reviewer のアドバーサリアル純化）、提案3（検証済みタスク単位のコミット粒度と選択的ステージング）、提案4（Implementation Notes の明示的読込・追記）、ja/en 両資産の対構造維持、対応する validate スクリプト・node:test の更新、挙動変更の kiro-impl skill 定義への反映。
- **対象外**: 提案5（リスク階層化 / model 階層化。takt 0.45.0 は parallel サブステップの条件スキップ非対応、かつ常時ゲート追加禁止と要調停）、提案6（loop_monitors threshold の数値調整）、ai-quality-gate サブワークフロー本体の責務再設計、新規 reviewer 観点（security 等）の常時必須化、requirements/design/tasks 生成や batch orchestration。
- **隣接システム／スペックへの期待**: `kiro-iterative-implementation-workflow` の既存フロー（readiness → one-task selection → 実行 → AI antipattern gate → 複数観点レビュー → 完了検証 → progress 更新）を基盤として参照し、その内部責務を吸収しない。`kiro-ai-quality-gate` サブワークフローには内部 fix ステップへのコマンドゲート付与のみを期待し本体設計は変更しない。`kiro-shared-workflow-contracts` の review verdict / completion / artifact policy contract は消費する。takt 0.45.0 engine は `quality_gates`（コマンド型）・`allow_git_commit`・`loop_monitors` を提供する前提とする。

## 要件

### 要件 1: 完了候補を決定論的コマンドゲートで検証する

**目的:** 実装者として、選択タスクの機械的正しさ（テスト緑・ビルド成功）を LLM の自己申告ではなくコマンドの終了コードで確定したい。そうすることで、hallucination や stale evidence による誤った完了判定を防げる。

#### 受け入れ基準

1. コード編集を行うステップ（タスク実行、および AI アンチパターン修正）が完了したとき、Kiro 実装ワークフローは選択タスクの検証コマンド（テスト／ビルド）を決定論的なコマンドゲートとして実行しなければならない。
2. コマンドゲートが非ゼロ終了で失敗した場合、Kiro 実装ワークフローは完了候補へ進めず、同一ステップへ失敗内容（コマンド・終了コード・標準出力／標準エラー）を差し戻して修正を促さなければならない。
3. 対象のコマンドゲートがすべてゼロ終了で成功した場合に限り、Kiro 実装ワークフローは複数観点レビューへ進まなければならない。
4. コマンドゲートを付与できないステップ種別（workflow_call / system）の場合、Kiro 実装ワークフローはそのステップにコマンドゲートを付与してはならない。
5. 選択タスクの検証コマンドをリポジトリから解決できない場合、Kiro 実装ワークフローはそのタスクを完了済みにせず、検証コマンド未解決を欠落証跡として返さなければならない。

### 要件 2: 再実行制御を loop_monitors に一本化したまま検証ゲートを統合する

**目的:** maintainer として、コマンドゲート導入後も再実行制御が `loop_monitors` のみで表現される状態を保ちたい。そうすることで、独自リトライ機構の二重化や無限ループを防げる。

#### 受け入れ基準

1. コマンドゲート失敗の同一ステップ差し戻しと、レビュー／完了検証失敗の debug ルーティングが併存する場合、Kiro 実装ワークフローは両者を区別し、重複するリトライループを作ってはならない。
2. Kiro 実装ワークフローは常に、実装／デバッグ／レビューの再実行上限を `loop_monitors.threshold` だけで表現し、facet・validator・frontmatter に独自リトライカウンタや独自ループ健全性管理を持ってはならない。
3. `loop_monitors` が非生産的ループと判定した場合、Kiro 実装ワークフローは追加実装へ戻らず、選択タスクの blocker note または人間確認相当の停止結果へ分岐しなければならない。

### 要件 3: アドバーサリアルな複数観点レビューで合意収束バイアスを抑止する

**目的:** reviewer として、各観点レビューが証拠に基づく不同意を既定とし、証拠がそろう場合だけ承認したい。そうすることで、証拠不十分なまま承認へ収束する false-consensus を防げる。

#### 受け入れ基準

1. 完了候補に対して複数観点レビューを実行するとき、各観点 reviewer（coding / architecture / qa / testing）は既定の判定を却下とし、選択タスク・要件・境界・実 diff の証拠を引用できる場合に限り承認しなければならない。
2. コマンドゲートが機械的正しさを担保している場合、coding review は機械的失敗の再発見ではなく、緑証跡の確認とコード正当性・タスク境界・実 diff・検証証跡の判断に集中しなければならない。
3. すべての reviewer 結果が承認相当である場合に限り、Kiro 実装ワークフローは完了検証へ進まなければならない。
4. いずれかの reviewer 結果が要修正／却下相当である場合、Kiro 実装ワークフローは完了検証へ進まず、対象観点・actionable findings・関連 task/requirement/design 参照を debug 判断へ渡さなければならない。
5. Kiro 実装ワークフローは security 専用 reviewer をこの feature の常時必須ゲートに追加してはならない。
6. Kiro 実装ワークフローは coding / architecture / qa / testing レビュー結果を相互に区別できる機械可読証跡として保持しなければならない。

### 要件 4: タスク単位のコミット粒度と選択的ステージングを確保する

**目的:** maintainer として、検証済みタスクごとにコミットが作られ、変更が選択タスクの範囲に限定された状態を保ちたい。そうすることで、bisect・rollback・中断後の再開が確実になる。

#### 受け入れ基準

1. 完了検証が VERIFIED かつ progress 更新が完了したとき、Kiro 実装ワークフローは選択タスク単位のコミットを作成しなければならない。
2. タスク単位のコミットを作成するとき、Kiro 実装ワークフローは選択タスクの `changed_files` と `tasks.md` だけを対象とし、無関係な `baseline_dirty_files` を巻き込んではならない。
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
2. 本 feature が機械チェック可能なワークフロー契約（コマンドゲート配置・reviewer 振る舞い・コミット粒度・知識伝播・loop_monitors 単一原則）を追加または変更するとき、実装ワークフロー検証は対応する validate スクリプトと node:test でそれを検証しなければならない。
3. 本 feature がワークフローの挙動を変更するとき、Kiro 実装ワークフローは挙動の source of truth である kiro-impl skill 定義を更新し、facet には adapter delta（input artifacts・output fields・rule condition・artifact write boundary）だけを記述しなければならない。
4. Kiro-specific facet が TAKT built-in facet を継承できる場合、実装ワークフロー検証は共有 `BuiltinFacetInheritancePolicy` に従い差分だけが記述されていることを検証しなければならない。
5. 実装ワークフロー検証は、本 feature が spec 生成・roadmap batch orchestration・status/validation workflow の責務を参照していないことを境界違反として検出しなければならない。
