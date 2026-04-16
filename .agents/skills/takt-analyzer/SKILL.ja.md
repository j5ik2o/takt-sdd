---
name: takt-analyzer
description: >
  既存のTAKTワークフローとファセットを分析し、改善提案を行うスキル。ワークフローYAMLの構造検証、
  ファセット間の整合性チェック、スタイルガイド準拠の確認、未使用ファセットの検出、
  ルール設計の最適化提案を実施する。実行ログ（.takt/logs/*.jsonl）が存在する場合は
  ログベース診断分析も行い、ルール評価効率・ループホットスポット・ABORT率等を報告する。
  references/taktのスタイルガイド・エンジン仕様を基準として分析する。
  トリガー：「ワークフローを分析」「taktの設定を確認」「ファセットの品質チェック」
  「ワークフローのレビュー」「takt analyze」「ワークフローの改善提案」
  「ワークフローの整合性チェック」「taktの問題を見つけて」
  「ログを分析」「実行ログの診断」「taktのログを見て」「ルール評価の統計」
  「ai_fallbackの頻度」「ループの検出」
---

# TAKT Analyzer

既存のTAKTワークフローとファセットを分析し、問題点の検出と改善提案を行う。

> **前提 takt バージョン**: v0.36.0

## 参照資料

| 資料 | パス | 用途 |
|------|------|------|
| YAMLスキーマ | `references/takt/builtins/skill/references/yaml-schema.md` | ワークフロー構造の検証基準 |
| エンジン仕様 | `references/takt/builtins/skill/references/engine.md` | ルール評価・実行仕様 |
| スタイルガイド群 | `references/takt/builtins/ja/*_STYLE_GUIDE.md` | ファセット品質基準 |
| ビルトインワークフロー | `references/takt/builtins/ja/workflows/` | 構造パターンの参照 |
| ビルトインファセット | `references/takt/builtins/ja/facets/{personas,policies,instructions,knowledge,output-contracts}/` | ファセット品質の参照 |
| ログ型定義 | `references/takt/src/core/logging/contracts.ts` | NDJSONレコード型の参照（v0.30.0で `observability` → `logging` にリネーム） |
| プロバイダイベント | `references/takt/src/core/logging/providerEventLogger.ts` | `*-provider-events.jsonl` の構造 |
| 利用イベント | `references/takt/src/core/logging/usageEventLogger.ts` | 利用量イベントの構造 |
| ルール評価 | `references/takt/src/core/workflow/evaluation/RuleEvaluator.ts` | matchedRuleMethod の仕組み（`when:` 決定論的条件含む） |

## takt-optimize との違い

| 観点 | takt-analyze | takt-optimize |
|------|-------------|---------------|
| 目的 | 問題検出・診断とレポート | 最適化の実行 |
| 出力 | 分析レポート（Markdown） | 最適化済みファイル群 |
| 変更 | なし（読み取り専用） | ファイルを直接編集・生成 |
| 入力 | ワークフローYAML + ファセット + **実行ログ** | 同左 |
| 判断 | 問題の重大度分類 | コスト/品質のトレードオフ判断 |

## 分析カテゴリ

### 1. ワークフロー構造分析

ワークフローYAMLの構造的な問題を検出する。

**チェック項目:**

| チェック | 内容 | 重大度 |
|---------|------|--------|
| initial_step存在 | `initial_step`が`steps`配列内に存在するか | Critical |
| 遷移先の有効性 | 全`rules.next`が有効なステップ名 or `COMPLETE`/`ABORT`か | Critical |
| loop健全遷移整合 | `loop_monitors.cycle` の健全時 `next` が cycle 先頭ノードと一致するか | Critical |
| loop参照レポート範囲 | `loop_monitors.judge.instruction` の `{report:...}` が cycle 内 step 生成物のみか | Critical |
| セクションマップ整合性 | セクションマップのキーとステップ内参照が一致するか | Critical |
| ファイルパス存在 | セクションマップのパスが実在するか | Critical |
| parallel構造 | 親ルールが`all()`/`any()`を使用、サブステップに`next`がないか | Warning |
| edit=false + ビルド操作 | `edit: false` のステップのインストラクションがビルドコマンド（`cargo check` 等）の禁止を明示しているか。読み取り専用サンドボックスでビルドは `Operation not permitted` で失敗する | Warning |
| supervise失敗の遷移先 | `supervise` の失敗ルールが `plan` に遷移していないか。修正可能な問題は `fix` へ遷移すべきで、`supervise → plan` は根本設計変更が必要な場合のみ | Warning |
| CI実行の責任配置 | `supervise`/`ai_review` 等の `edit: false` ステップのインストラクションがCIの直接実行を禁止し、`fix`/`implement` のレポート証跡確認のみを求めているか | Warning |
| provider_options構造 | `allowed_tools` がトップレベルではなく `provider_options.claude.allowed_tools` に配置されているか（v0.30.0〜） | Warning |
| edit権限 | `edit: true`のステップに適切な`required_permission_mode`があるか | Info |
| session設定 | 実装系ステップに`session: refresh`があるか | Info |

### 2. ファセット品質分析

各ファセットがスタイルガイドに準拠しているか確認する。

**Persona チェック:**
- [ ] ロール定義が1-2文
- [ ] 「やること」「やらないこと」に担当エージェント名
- [ ] ポリシーの詳細ルール（コード例・テーブル）が混入していない
- [ ] ワークフロー固有の概念（ステップ名等）がない
- [ ] サイズ: simple 100行以内、expert 550行以内
- [ ] `####`以下のネストがない

**Policy チェック:**
- [ ] 目的説明が1文
- [ ] 原則テーブルが存在
- [ ] 特定エージェント固有の知識がない
- [ ] サイズ: 300行以内

**Instruction チェック:**
- [ ] 冒頭が命令形
- [ ] `{task}`, `{previous_response}`を手動記述していない
- [ ] ペルソナ/ポリシーの内容が混入していない
- [ ] サイズ: 種別に応じた上限内

**Output Contract チェック:**
- [ ] ` ```markdown `コードブロックで囲まれている
- [ ] レビュー系にステータスと認知負荷軽減ルール
- [ ] ファイル名に番号プレフィックスがない
- [ ] サイズ: 30行以内

### 3. ファセット分離分析

ファセット間の責務が適切に分離されているか検出する。

| 違反パターン | 説明 | 修正方向 |
|-------------|------|----------|
| ペルソナにポリシー詳細 | コード例・テーブル付きのルールがペルソナ内に | → ポリシーに移動 |
| ペルソナにワークフロー概念 | ステップ名・レポートファイル名がペルソナ内に | → インストラクションに移動 |
| ポリシーに固有知識 | 特定エージェント固有の検出手法がポリシー内に | → ペルソナのドメイン知識に移動 |
| インストラクションに原則 | 共有コーディング原則がインストラクション内に | → ポリシーに移動 |
| 出力契約に手順 | 実行手順が出力契約内に | → インストラクションに移動 |

### 4. ルール設計分析

ルール条件の設計を評価する。

| チェック | 内容 |
|---------|------|
| タグ vs AI判定 | タグベース条件で対応可能な箇所でai()を使用していないか |
| aggregate使用 | parallelの親でall()/any()を使用しているか |
| 到達不能ルール | どの条件にも該当しないケースがないか |
| ループリスク | fix→review等の循環にloop_monitorsがあるか |
| loop健全遷移 | 各 loop monitor で「健全（進捗あり）」の `next` が cycle 先頭ノードか |
| loopレポート整合 | loop monitor が cycle 外 step 専用レポートを参照していないか |
| ABORT条件 | 失敗時のABORT遷移が適切に定義されているか |

### 5. ビルトイン活用分析

カスタムファセットがビルトインで代替可能か検出する。

**手順:**
1. カスタムファセットの内容をビルトインファセットと比較
2. 類似度が高い場合はビルトインへの置き換えを提案
3. ビルトインのbare name参照とセクションマップ参照の混在を検出

### 6. ログベース診断分析

実行ログ（`.takt/logs/*.jsonl`）を解析し、動的な問題を検出する。ログがない場合はスキップする。

#### a) ログの場所と形式

- `.takt/logs/{sessionId}.jsonl`（NDJSON形式: 1行1JSONオブジェクト）
- `.takt/logs/{sessionId}-provider-events.jsonl`（プロバイダイベントログ、別ファイル）
- `.takt/logs/{sessionId}/trace.md`（トレースレポート、Markdown形式）
- `.takt/logs/latest.json` で最新セッションIDを参照

**NDJSONレコード型一覧:**

| type | 内容 |
|------|------|
| `piece_start` | ピース実行の開始 |
| `step_start` | ステップの開始 |
| `step_complete` | ステップ完了（`matchedRuleIndex`, `matchedRuleMethod` を含む） |
| `phase_start` | フェーズの開始 |
| `phase_complete` | フェーズ完了（`error` フィールドあり） |
| `piece_complete` | ピース実行の正常完了（`iterations` を含む） |
| `piece_abort` | ピース実行の中断（`reason` を含む） |
| `interactive_start` / `interactive_end` | インタラクティブモードの開始・終了 |

> 各レコード型の詳細フィールドは `references/takt/src/shared/utils/types.ts` を参照。

#### b) matchedRuleMethod

`step_complete` レコードの `matchedRuleMethod` は、ルール評価エンジンがどの手法でルールをマッチさせたかを示す。

**評価順序（フォールバックチェーン）:**

```
1. aggregate     → all()/any() による並列サブステップ集約
2. phase3_tag    → Phase 3 出力からのタグ検出
3. phase1_tag    → Phase 1 出力からのタグ検出（フォールバック）
4. ai_judge      → ai() 条件のみをAI判定
5. ai_judge_fallback → 全条件をAI判定（最終フォールバック）
```

**手法別の特性:**

| method | コスト | 信頼性 | 説明 |
|--------|--------|--------|------|
| `aggregate` | なし | 高 | 並列サブステップの完了状態で判定 |
| `phase3_tag` | なし | 高 | 出力テンプレートのタグで確定的に判定 |
| `phase1_tag` | なし | 中 | エージェント応答からタグ検出 |
| `ai_judge` | API 1回 | 中 | `ai()` 条件のみをAI判定 |
| `ai_judge_fallback` | API 1回 | 低 | 全条件をAI判定（タグ検出失敗時） |
| `auto_select` | なし | 高 | ルールが1つのみの場合の自動選択 |
| `structured_output` | なし | 高 | 構造化出力による判定 |

> `ai_judge_fallback` の頻度が高い場合、output-contract にタグ出力指示を追加すべき。

#### c) 診断分析項目

| 分析 | 方法 | 重大度判定基準 |
|------|------|---------------|
| ループホットスポット | 同一ステップの `step_start` 出現回数を集計 | 閾値超え=Warning、`loop_monitor` 未設定=Critical |
| デッドルール | `matchedRuleIndex` の分布でマッチ0回のルールを検出 | Critical（到達不能コード） |
| ルール評価効率 | `matchedRuleMethod` の分布を集計。`ai_judge_fallback` の割合に注目 | >50%=Warning、>80%=Critical |
| ABORT率 | `piece_abort` / `piece_complete` の比率 | >30%=Warning、>50%=Critical |
| フェーズ別エラー | `phase_complete` の `error` フィールドを集計 | 同一フェーズで繰り返しエラー=Warning |
| イテレーション効率 | `piece_complete.iterations` vs `max_steps` | 常に上限近く=Warning |

#### d) 複数ログの統合分析ガイド

- **3回以上**: パターン確認に十分。統計的な傾向を報告する
- **1回**: 参考情報として扱い、静的分析を優先する

#### e) ログ診断レポート例

```markdown
## ログ診断結果

### 分析対象
- セッション数: 5
- 期間: 2026-03-01 〜 2026-03-04

### ルール評価効率
| ステップ | phase3_tag | ai_judge | ai_judge_fallback | 改善優先度 |
|------------|-----------|---------|-------------------|----------|
| ai_review  | 20%       | 13%     | 67%               | 高       |
| supervise  | 80%       | 20%     | 0%                | -        |

### ループホットスポット
| サイクル | 最大連続回数 | loop_monitor | 状態 |
|---------|------------|-------------|------|
| review→fix | 6 | threshold: 3 | OK |
| implement→test | 4 | なし | Warning: loop_monitor未設定 |

### ABORT分析
- 成功: 4/5 (80%)
- ABORT: 1/5 (20%) - reason: "max_steps exceeded"
```

## ワークフロー

### Step 1: 対象の特定

分析対象のワークフローYAMLを特定し、実行ログの有無を確認する。

```
探索順序:
1. ユーザー指定のパス
2. ~/.takt/workflows/ 内のカスタムワークフロー
3. .takt/workflows/ 内のプロジェクトワークフロー

ログ確認:
- .takt/logs/ ディレクトリの存在確認
- ログあり → 静的分析 + ログ診断
- ログなし → 静的分析のみ（従来通り）
```

### Step 2: ワークフローYAML解析

ワークフローYAMLを読み込み、構造分析を実施する。

1. YAML構文の検証
2. ステップ構成の確認
3. ルール条件の型チェック
4. セクションマップの参照解決

### Step 3: ファセット読み込みと品質チェック

セクションマップとビルトイン参照から全ファセットを読み込み、スタイルガイドに照合する。

### Step 3.5: ログ読み込みと診断（ログがある場合のみ）

1. `.takt/logs/latest.json` から最新セッションIDを取得
2. 対象の `.jsonl` ファイルを読み込み、NDJSONレコードを解析
3. カテゴリ6の診断分析項目に従い、各指標を算出
4. 複数ログがある場合は統合分析を実施

### Step 4: 分離分析

ファセット間の責務侵犯を検出する。

### Step 5: レポート出力

```markdown
# TAKT分析レポート: {ワークフロー名}

## サマリー
- Critical: {N件}
- Warning: {N件}
- Info: {N件}

## Critical（必須修正）
| # | カテゴリ | 場所 | 問題 |
|---|---------|------|------|

## Warning（推奨修正）
| # | カテゴリ | 場所 | 問題 | 改善案 |
|---|---------|------|------|--------|

## Info（改善提案）
| # | カテゴリ | 場所 | 提案 |
|---|---------|------|------|

## ビルトイン活用の提案
{カスタムファセットのビルトイン置き換え提案}

## ログ診断結果（ログ提供時のみ）
{ログベース診断のサマリー}
```
