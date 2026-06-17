# 実装計画

> 前提: 本 spec は既存 `kiro-iterative-implementation-workflow` を Extends し、**ステップ topology を変えず** step 属性 + facet 内容 + 検証層拡張で実現する。挙動の正本は kiro-impl SKILL.md（`.claude` / `.agents`）。全変更を ja/en 対で行う。

- [ ] 1. 基盤
- [x] 1.1 検証フック規約と dogfooding フックの確立
  - リポジトリ提供の任意検証フック（`.kiro/settings/verify.sh`）を、skill autonomous mode で parent が `READY_FOR_REVIEW` 後に実行できる hook として定義する
  - takt-sdd 自身の検証フックを用意し、リポジトリ標準の検証（validate/test）を実行して失敗時に非ゼロ終了する
  - 検証フックを**全タスクの境界外（実装中は不変）**と位置づけ、タスクによる改変を許さない旨を境界ガイダンスに含める（review Issue 3 緩和）
  - 観測可能完了: takt-sdd 直下に検証フックが存在し、意図的に失敗する内容にすると非ゼロ終了する（手動実行で確認）
  - _Requirements: 1_
  - _Boundary:_ verify.sh 規約
  - _Depends:_ none

- [x] 1.2 SKILL 正本へ新挙動を記述
  - kiro-impl skill 定義（`.claude` と `.agents` の2箇所）に「READY_FOR_REVIEW 後の parent-run verification hook」「タスク単位の選択的コミット」「アドバーサリアル複数観点レビュー」「Implementation Notes の明示伝播」を記述する
  - facet が参照する既存セクション見出しは変更せず、本文に挙動を追記する（facet→skill section 参照を壊さない）
  - 観測可能完了: 両 SKILL.md に4挙動が記述され、既存の参照セクション見出しが不変であることを差分で確認できる
  - _Requirements: 1, 3, 4, 5, 6_
  - _Boundary:_ SKILL 正本
  - _Depends:_ none

- [ ] 2. コア
- [x] 2.1 execute-task の検証証跡 discipline と無条件 gate 禁止
  - 実装ワークフローの execute-task には無条件 command 型品質ゲートを付与しない（ja/en）
  - `READY_FOR_REVIEW` は task-local validation command、exit code、fresh output を `validation_evidence` に記録できた場合だけ返すことを facet に明記する
  - `BLOCKED` / `NEEDS_CONTEXT` は workflow rules で debug 経路へ進め、無条件 gate が先取りしないことを validator で固定する
  - 再実行上限は loop_monitors のみに保ち、独自リトライカウンタを導入しない
  - 観測可能完了: ja/en の execute-task に command 型ゲートが存在せず、READY_FOR_REVIEW だけが後続（AI品質ゲート）へ進む経路になっている
  - _Requirements: 1, 2_
  - _Boundary:_ 検証コマンドゲート（kiro-impl.yaml execute-task）
  - _Depends:_ 1.1, 1.2

- [x] 2.2 ai-antipattern-fix の無条件 gate 禁止
  - AI 品質ゲートサブワークフローの ai-antipattern-fix（コード編集ステップ）には、BLOCKED / NEED_REPLAN 経路を阻害する無条件 command 型品質ゲートを付与しない（ja/en）
  - サブワークフローの内部ステップ構成・ループ設計は変更しない
  - 観測可能完了: ja/en の ai-antipattern-fix に command 型ゲートが存在せず、STATUS rules が維持される
  - _Requirements: 1_
  - _Boundary:_ 検証コマンドゲート（kiro-ai-quality-gate.yaml ai-antipattern-fix）
  - _Depends:_ 1.1, 1.2

- [x] 2.3 update-progress へのタスク単位コミット付与
  - 完了検証が VERIFIED の後、update-progress が選択タスクの変更ファイルと tasks.md のみを選択的にステージしてコミットできるよう、コミット許可属性と選択的コミット手順を付与する（`git add -A` は用いない）
  - blocker 経路ではコミットせず、stale 検出時は他 worker を上書きしないという既存ガードを維持する
  - 既定 auto-commit との粒度調停（pipeline では本コミットが唯一、worktree 末尾の一括コミットは残差のみ）を SKILL/facet に明記する
  - 観測可能完了: ja/en の update-progress にコミット許可属性が付き、VERIFIED 時のみ選択的コミットが行われる手順になっている
  - _Requirements: 4_
  - _Boundary:_ per-task commit（kiro-impl.yaml update-progress + facet）
  - _Depends:_ 1.2, 2.1

- [x] 2.4 複数観点レビューのアドバーサリアル化
  - coding / architecture / qa / testing の各レビュー facet を「既定は却下、選択タスク・要件・境界・実 diff の証拠を引用できる場合のみ承認」へ更新する（ja/en）
  - coding review を fresh validation evidence の確認とコード正当性・境界・diff の判断に集中させる
  - reviewer 構成（名前・順序・persona・report・approved/needs_fix 集約・all 承認集約）と security 非常時の方針は変更しない
  - 観測可能完了: 4 レビュー facet が ja/en で既定却下・証拠引用承認を明記し、集約契約が不変である
  - _Requirements: 3_
  - _Boundary:_ adversarial review facets
  - _Depends:_ 1.2

- [x] 2.5 Implementation Notes の明示伝播
  - execute-task facet に「着手前に選択タスクの境界・依存に関連する Implementation Notes を読み、再発防止に充てる」を明記する（ja/en）
  - debug-task facet に「関連する Implementation Notes を root cause 分析と修正計画の入力に用いる」を明記する（ja/en）
  - 参照・追記は選択タスクまたは共有 notes の範囲に限定する
  - 観測可能完了: execute-task / debug-task facet が ja/en で Implementation Notes の読込・活用を明記している
  - _Requirements: 5_
  - _Boundary:_ 知識伝播 facets
  - _Depends:_ 1.2

- [ ] 3. 統合
- [x] 3.1 検証スクリプトへの新契約アサーション追加
  - 実装ワークフロー検証スクリプトに、execute-task の無条件 command gate 禁止、update-progress のコミット許可属性、レビュー facet のアドバーサリアル語彙、execute/debug facet の Implementation Notes、実 spec tasks path を検証するアサーションを追加する
  - AI 品質ゲート検証スクリプトに、ai-antipattern-fix の無条件 command gate 禁止のアサーションを追加する
  - 既存契約（ステップ順序・all 承認集約・loop_monitors 文字列・security 非常時・独自カウンタ禁止）の検証は保持する
  - 観測可能完了: 新旧アサーションを含む検証スクリプトが緑で完了する（`npm run validate:kiro-iterative-implementation-workflow` 等）
  - _Requirements: 6_
  - _Boundary:_ 検証層（validators）
  - _Depends:_ 2.1, 2.2, 2.3, 2.4, 2.5

- [x] 3.2 検証テストへの reject ケース追加
  - 新契約ごとの reject ケース（無条件 gate 追加・コミット許可欠落・非アドバーサリアル facet・Implementation Notes 欠落・実 spec tasks path 欠落）をテストに追加し、カバレッジ配列を更新する
  - 既存 reject ケースの回帰がないことを保つ
  - 観測可能完了: node:test が新旧 reject ケースを含めて緑で完了する（`npm run test:kiro-iterative-implementation-workflow` 等）
  - _Requirements: 6_
  - _Boundary:_ 検証層（tests）
  - _Depends:_ 3.1

- [ ] 4. 検証
- [x] 4.1 ja/en parity と全検証スイートの通過確認
  - 該当領域の validate / test スイートを実行し、ja/en の構造・machine term の drift がないことを確認する
  - 観測可能完了: 対象の `validate:*` と `test:*` がすべて緑で、言語ペア drift エラーが出ない
  - _Requirements: 6_
  - _Boundary:_ 検証層（full suite）
  - _Depends:_ 3.1, 3.2

- [x] 4.2 無条件 command gate 禁止の回帰確認
  - `execute-task` / `ai-antipattern-fix` に無条件 command gate を追加した場合に validator が fail することを確認する
  - `BLOCKED` / `NEEDS_CONTEXT` / `NEED_REPLAN` 経路が gate 失敗に先取りされないことを設計契約として固定する
  - 観測可能完了: 無条件 command gate 追加の reject ケースが node:test で緑になる
  - _Requirements: 1, 2_
  - _Boundary:_ runtime smoke
  - _Depends:_ 2.1, 2.2

## Implementation Notes

- 1.1: 検証フックは `.kiro/settings/verify.sh`。TAKT workflow の無条件 command gate では呼ばず、skill autonomous mode で parent が `READY_FOR_REVIEW` 後に存在時のみ実行する。`set -e` + `npm run validate:kiro-iterative-implementation-workflow` / `validate:kiro-ai-quality-gate-workflow-coverage` を実行。**verify.sh は impl 中 immutable（タスク境界外）**。
- 1.2: SKILL 正本（`.claude` / `.agents`）に4挙動を追加記述済み。既存セクション見出しは保持。`.claude` の Manual Mode 見出しを `#### → ###` に補正し facet 参照（`### Manual Mode (main context)`）と整合させた。タスク2.x の facet 追記時はこの SKILL 記述と齟齬がないようにする。
- 2.1/2.2 (PR #104 correction): execute-task / ai-antipattern-fix の無条件 command `quality_gates` は、TAKT 仕様上 rules 評価前に常に実行され BLOCKED / NEEDS_CONTEXT / NEED_REPLAN 経路を先取りするため撤回。validator は両 step への無条件 command gate 再導入を `COMMAND_GATE_DRIFT` として reject する。
- 2.4: 4 review facet（ja/en 計8）に正確マーカー `Adversarial review posture: default VERDICT is REJECTED; approve only with cited evidence (selected task, requirement, boundary, actual diff).` を追加。coding review は fresh validation evidence と実 diff を確認する。3.1 validator はこのマーカー文字列を全 review facet で assert する。
- 2.3: update-progress step に `allow_git_commit: true`（`required_permission_mode: edit` 直後）。facet に「VERIFIED 経路のみ・implementation changed files + current AI fix changed files + `.kiro/specs/<feature>/tasks.md`・`git add -A` 禁止・pipeline/worktree 調停」を追記。3.1 validator は update-progress step の `allow_git_commit: true` と実 spec tasks path を assert。
- 2.5: execute-task facet に「## Implementation Notes intake/読込」、debug facet に「## Implementation Notes reference/参照」を追加（2.1 のゲートnote と別段落）。3.1 validator は execute-task / debug-task facet に `Implementation Notes` トークンを assert（既存 spec の terms 配列に追加）。
- 3.1: iterative validator に `COMMAND_GATE_DRIFT`(execute-task 無条件 gate 禁止)・`COMMIT_GATE_DRIFT`(update-progress allow_git_commit)、review terms に adversarial マーカー、execute/debug terms に Implementation Notes、update-progress terms に `.kiro/specs/<feature>/tasks.md` を追加。coverage validator に `validateNoAntipatternFixCommandGate`(ai-fix 無条件 gate 禁止)。
- 3.2: reject ケース6本追加（iterative test に5: execute unconditional gate/commit/adversarial/exec-notes/debug-notes、ai-gate coverage test に1: ai-fix unconditional gate）。`validateTaskFixtureCoverage` 配列に新テスト名を登録（削除耐性）。
- 4.1: `validate:all` 対象で再確認する。test:all の real-provider-smoke は provider 必要のため未実行予定。
- 4.2: 実ゲートコマンド smoke は撤回。代わりに無条件 command gate 追加を validator reject するテストで、PR #104 の BLOCKED routing regression を固定する。
