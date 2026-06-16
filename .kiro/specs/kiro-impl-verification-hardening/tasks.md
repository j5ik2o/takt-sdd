# 実装計画

> 前提: 本 spec は既存 `kiro-iterative-implementation-workflow` を Extends し、**ステップ topology を変えず** step 属性 + facet 内容 + 検証層拡張で実現する。挙動の正本は kiro-impl SKILL.md（`.claude` / `.agents`）。全変更を ja/en 対で行う。

- [ ] 1. 基盤
- [ ] 1.1 検証フック規約と dogfooding フックの確立
  - リポジトリ提供の任意検証フック（`.kiro/settings/verify.sh`）を「存在すればゲートが実行、不在なら no-op 通知で成功」とする規約を定義する
  - takt-sdd 自身の検証フックを用意し、リポジトリ標準の検証（validate/test）を実行して失敗時に非ゼロ終了する
  - 検証フックを**全タスクの境界外（実装中は不変）**と位置づけ、タスクによる改変を許さない旨を境界ガイダンスに含める（review Issue 3 緩和）
  - 観測可能完了: takt-sdd 直下に検証フックが存在し、意図的に失敗する内容にすると非ゼロ終了する（手動実行で確認）
  - _Requirements:_ 1
  - _Boundary:_ verify.sh 規約
  - _Depends:_ none

- [ ] 1.2 SKILL 正本へ新挙動を記述
  - kiro-impl skill 定義（`.claude` と `.agents` の2箇所）に「コマンドゲートによる決定論的検証」「タスク単位の選択的コミット」「アドバーサリアル複数観点レビュー」「Implementation Notes の明示伝播」を記述する
  - facet が参照する既存セクション見出しは変更せず、本文に挙動を追記する（facet→skill section 参照を壊さない）
  - 観測可能完了: 両 SKILL.md に4挙動が記述され、既存の参照セクション見出しが不変であることを差分で確認できる
  - _Requirements:_ 1, 3, 4, 5, 6
  - _Boundary:_ SKILL 正本
  - _Depends:_ none

- [ ] 2. コア
- [ ] 2.1 execute-task への決定論的コマンドゲート付与
  - 実装ワークフローの execute-task に、コード編集完了後に検証フックを実行する command 型品質ゲートを付与する（ja/en 同一コマンド文字列）
  - ゲート非ゼロ終了時は同一ステップへ失敗出力を差し戻す挙動とし、レビュー/検証失敗の debug 経路とは別レイヤであることを facet に明記する（重複リトライ防止）
  - 再実行上限は loop_monitors のみに保ち、独自リトライカウンタを導入しない
  - 観測可能完了: ja/en の execute-task に command 型ゲートが存在し、全ゲート成功時のみ後続（AI品質ゲート）へ進む経路になっている
  - _Requirements:_ 1, 2
  - _Boundary:_ 検証コマンドゲート（kiro-impl.yaml execute-task）
  - _Depends:_ 1.1, 1.2

- [ ] 2.2 (P) ai-antipattern-fix への決定論的コマンドゲート付与
  - AI 品質ゲートサブワークフローの ai-antipattern-fix（コード編集ステップ）に、execute-task と同型の command 型品質ゲートを付与する（ja/en）
  - サブワークフローの内部ステップ構成・ループ設計は変更せず、ゲート属性付与のみに留める（Adjacent 最小変更）
  - 観測可能完了: ja/en の ai-antipattern-fix に同型ゲートが存在し、修正後に検証フックが実行される
  - _Requirements:_ 1
  - _Boundary:_ 検証コマンドゲート（kiro-ai-quality-gate.yaml ai-antipattern-fix）
  - _Depends:_ 1.1, 1.2

- [ ] 2.3 update-progress へのタスク単位コミット付与
  - 完了検証が VERIFIED の後、update-progress が選択タスクの変更ファイルと tasks.md のみを選択的にステージしてコミットできるよう、コミット許可属性と選択的コミット手順を付与する（`git add -A` は用いない）
  - blocker 経路ではコミットせず、stale 検出時は他 worker を上書きしないという既存ガードを維持する
  - 既定 auto-commit との粒度調停（pipeline では本コミットが唯一、worktree 末尾の一括コミットは残差のみ）を SKILL/facet に明記する
  - 観測可能完了: ja/en の update-progress にコミット許可属性が付き、VERIFIED 時のみ選択的コミットが行われる手順になっている
  - _Requirements:_ 4
  - _Boundary:_ per-task commit（kiro-impl.yaml update-progress + facet）
  - _Depends:_ 1.2, 2.1

- [ ] 2.4 (P) 複数観点レビューのアドバーサリアル化
  - coding / architecture / qa / testing の各レビュー facet を「既定は却下、選択タスク・要件・境界・実 diff の証拠を引用できる場合のみ承認」へ更新する（ja/en）
  - コマンドゲートが機械的正しさを担保する前提で、coding review を緑証跡の確認とコード正当性・境界・diff の判断に集中させる
  - reviewer 構成（名前・順序・persona・report・approved/needs_fix 集約・all 承認集約）と security 非常時の方針は変更しない
  - 観測可能完了: 4 レビュー facet が ja/en で既定却下・証拠引用承認を明記し、集約契約が不変である
  - _Requirements:_ 3
  - _Boundary:_ adversarial review facets
  - _Depends:_ 1.2

- [ ] 2.5 (P) Implementation Notes の明示伝播
  - execute-task facet に「着手前に選択タスクの境界・依存に関連する Implementation Notes を読み、再発防止に充てる」を明記する（ja/en）
  - debug-task facet に「関連する Implementation Notes を root cause 分析と修正計画の入力に用いる」を明記する（ja/en）
  - 参照・追記は選択タスクまたは共有 notes の範囲に限定する
  - 観測可能完了: execute-task / debug-task facet が ja/en で Implementation Notes の読込・活用を明記している
  - _Requirements:_ 5
  - _Boundary:_ 知識伝播 facets
  - _Depends:_ 1.2

- [ ] 3. 統合
- [ ] 3.1 検証スクリプトへの新契約アサーション追加
  - 実装ワークフロー検証スクリプトに、execute-task のコマンドゲート存在、update-progress のコミット許可属性、レビュー facet のアドバーサリアル語彙、execute/debug facet の Implementation Notes、ゲートコマンドの ja/en parity を検証するアサーションを追加する
  - AI 品質ゲート検証スクリプトに、ai-antipattern-fix のコマンドゲート存在のアサーションを追加する
  - 既存契約（ステップ順序・all 承認集約・loop_monitors 文字列・security 非常時・独自カウンタ禁止）の検証は保持する
  - 観測可能完了: 新旧アサーションを含む検証スクリプトが緑で完了する（`npm run validate:kiro-iterative-implementation-workflow` 等）
  - _Requirements:_ 6
  - _Boundary:_ 検証層（validators）
  - _Depends:_ 2.1, 2.2, 2.3, 2.4, 2.5

- [ ] 3.2 検証テストへの reject ケース追加
  - 新契約ごとの reject ケース（ゲート欠落・コミット許可欠落・非アドバーサリアル facet・Implementation Notes 欠落・parity 不一致）をテストに追加し、カバレッジ配列を更新する
  - 既存 reject ケースの回帰がないことを保つ
  - 観測可能完了: node:test が新旧 reject ケースを含めて緑で完了する（`npm run test:kiro-iterative-implementation-workflow` 等）
  - _Requirements:_ 6
  - _Boundary:_ 検証層（tests）
  - _Depends:_ 3.1

- [ ] 4. 検証
- [ ] 4.1 ja/en parity と全検証スイートの通過確認
  - 該当領域の validate / test スイートを実行し、ja/en の構造・machine term の drift がないことを確認する
  - 観測可能完了: 対象の `validate:*` と `test:*` がすべて緑で、言語ペア drift エラーが出ない
  - _Requirements:_ 6
  - _Boundary:_ 検証層（full suite）
  - _Depends:_ 3.1, 3.2

- [ ] 4.2 ゲート挙動の runtime smoke 確認
  - 検証フックを意図的に失敗させた場合にタスクが完了へ進まず、同一ステップ差し戻し後に loop_monitors で停止に至ることを smoke で確認する（ゲート再試行上限の有無も確認、review R5）
  - 検証フック不在時はゲートが no-op となり、完了可否は既存の完了検証証跡ゲートが担保することを確認する
  - 観測可能完了: 失敗フックでタスクが未完了のまま停止し、不在フックでは既存フローが非破壊で進むことを smoke で観測できる
  - _Requirements:_ 1, 2
  - _Boundary:_ runtime smoke
  - _Depends:_ 2.1, 2.2
