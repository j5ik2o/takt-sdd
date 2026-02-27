与えられたタスクの説明から、EARS形式の要件ドキュメントを生成せよ。

**注意:** 既存の仕様ディレクトリが存在する場合は、既存の要件を上書きせず追加・更新する。

**やること:**
1. タスクから対象feature名を特定する
2. `.kiro/steering/` ディレクトリが存在すれば全ファイルを読み込み、プロジェクトコンテキストを把握する
3. `.kiro/specs/` 配下に対象featureのディレクトリが存在するか確認する（なければ作成）
4. `.kiro/specs/{feature}/spec.json` を確認する:
   - 存在しない場合: 初期値で作成する — `feature_name` = feature名, `created_at` / `updated_at` = 現在のISO 8601タイムスタンプ, `language` = `"ja"`, `phase` = `"initialized"`, `approvals.requirements` / `approvals.design` / `approvals.tasks` 各 = `{ "generated": false, "approved": false }`, `ready_for_implementation` = `false`
   - 存在する場合: `phase` が `"initialized"` または `"requirements-generated"` であることを確認する。それ以外の場合はABORT
5. 既存コードベースを調査し、対象featureに関する既存実装の有無を判定する
6. タスクの説明を分析し、機能要件・非機能要件を抽出する
7. 各要件にEARS形式の受け入れ条件を作成する
8. 正常系・異常系・境界条件を網羅する
9. 要件間の依存関係を特定する
10. 成果物を `.kiro/specs/{feature}/requirements.md` に保存する
11. `.kiro/specs/{feature}/spec.json` を更新する: `phase` を `"requirements-generated"` に、`approvals.requirements.generated` を `true` に設定し、`updated_at` を更新する

**成果物の保存先:**
- ディレクトリ: `.kiro/specs/{feature}/`（存在しなければ作成）
- ファイル: `requirements.md`

**必須出力（見出しを含める）**

## 導入
- 機能の概要と目的を1-2段落で記述

## 実装コンテキスト
- 既存実装の有無（あり/なし）を明記する
- 判定根拠（確認した既存コードやディレクトリ）を1-3行で記述する

## 要件
- 要件ごとにセクションを分ける
- 各要件に目的文と受け入れ条件を含める
- 要件IDは数値のみ（1, 1.1, 2, 2.1 ...）
