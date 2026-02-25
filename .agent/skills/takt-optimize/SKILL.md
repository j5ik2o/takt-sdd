---
name: takt-optimize
description: >
  既存のTAKTワークフロー（ピースYAML・ファセット群）を最適化するスキル。
  トークン消費削減、ムーブメント統合、ルール簡素化、ファセット再利用促進、
  ループ制御の改善、並列化の提案を実施し、最適化後のファイルを直接生成する。
  実行ログ（.takt/logs/*.jsonl）が提供された場合は、ルールマッチ分布・ループ頻度・
  ABORT率などの実データに基づく最適化も行う。
  takt-analyzeが「分析・レポート」に特化するのに対し、本スキルは「最適化の実行」に特化する。
  references/taktのエンジン仕様・スタイルガイドを基準とする。
  トリガー：「ピースを最適化」「taktの高速化」「ワークフローを軽くしたい」
  「トークンを減らしたい」「ムーブメントを減らしたい」「takt optimize」
  「ワークフローの効率化」「ファセットを整理したい」「ピースをスリムにして」
  「taktのコスト削減」「ワークフローをシンプルにしたい」
  「ログから最適化」「実行ログを分析して最適化」「taktのログを見て改善」
---

# TAKT Optimizer

既存のTAKTワークフローを分析し、最適化を実行する。

## 参照資料

| 資料 | パス | 用途 |
|------|------|------|
| YAMLスキーマ | `references/takt/builtins/skill/references/yaml-schema.md` | ピース構造の検証基準 |
| エンジン仕様 | `references/takt/builtins/skill/references/engine.md` | プロンプト構築・トークン消費の理解 |
| スタイルガイド群 | `references/takt/builtins/ja/*_STYLE_GUIDE.md` | ファセットサイズ上限 |
| ビルトインピース | `references/takt/builtins/ja/pieces/` | 最適化パターンの参照 |
| ビルトインファセット | `references/takt/builtins/ja/{personas,policies,instructions,knowledge,output-contracts}/` | ビルトイン置換候補 |

## takt-analyzeとの違い

| 観点 | takt-analyze | takt-optimize |
|------|-------------|---------------|
| 目的 | 問題検出とレポート | 最適化の実行 |
| 出力 | 分析レポート（Markdown） | 最適化済みファイル群 |
| 変更 | なし（読み取り専用） | ファイルを直接編集・生成 |
| 判断 | 問題の重大度分類 | コスト/品質のトレードオフ判断 |

## 最適化カテゴリ

### 1. トークン消費削減

プロンプト構築時のトークン量を削減する。

**エンジンのプロンプト構築順序（参照: engine.md）:**
```
ペルソナ → ポリシー → コンテキスト → ナレッジ → インストラクション
→ タスク → 前回出力 → レポート指示 → タグ指示 → ポリシーリマインダー
```

**注意**: ポリシーは冒頭と末尾に2回注入される（Lost in the Middle対策）。ポリシーの肥大化はトークン消費を2倍にする。

| 最適化 | 手法 | 効果 |
|--------|------|------|
| ペルソナ圧縮 | 冗長な記述の除去、サイズ上限内への圧縮 | 各ムーブメントで削減 |
| ポリシー分割 | 巨大ポリシーを用途別に分割し、必要なムーブメントにのみ割り当て | 2倍効果（リマインダー分） |
| ナレッジ絞り込み | ムーブメントに不要なナレッジ参照を除去 | 不要コンテキスト削減 |
| インストラクション簡素化 | 自動注入される内容の手動記述を除去 | 重複排除 |
| 出力契約スリム化 | 30行超の出力契約を圧縮 | レポート指示部分で削減 |

**ファセットサイズ目安:**

| ファセット | 推奨 | 上限 |
|-----------|------|------|
| Persona (simple) | 30-50行 | 100行 |
| Persona (expert) | 50-300行 | 550行 |
| Policy | 60-250行 | 300行 |
| Instruction (review) | 5-12行 | - |
| Instruction (plan/fix) | 10-20行 | - |
| Instruction (implement) | 30-50行 | - |
| Output Contract | 10-25行 | 30行 |

### 2. ムーブメント統合

不要なムーブメントを統合してワークフロー全体のステップ数を減らす。

| パターン | 検出条件 | 最適化 |
|---------|---------|--------|
| 連続する同一ペルソナ | 隣接ムーブメントが同じペルソナ | 1ムーブメントに統合 |
| 単一ルール遷移 | ルールが1つで無条件遷移 | 前後ムーブメントと統合検討 |
| edit=false連鎖 | 読み取り専用ムーブメントの連鎖 | 統合可能性を評価 |

**統合判断基準:**
- ムーブメント間でペルソナが同じか異なるか
- session: refreshの境界を壊さないか
- レポート出力の独立性が必要か
- ルール分岐が実質的に意味を持つか

### 3. ルール簡素化

ルール条件の効率化を行う。

| 最適化 | Before | After |
|--------|--------|-------|
| ai()→タグ置換 | `ai("実装が完了した")` | `"実装完了"` (タグベース) |
| 到達不能ルール除去 | 3つの条件うち1つが不到達 | 不到達ルールを削除 |
| 条件テキスト短縮 | `"全てのレビュアーが承認した"` | `"approved"` |

**ai() vs タグベースの判断:**
- タグベース（推奨）: 結果が明確に分類できる場合
- ai(): 判定に文脈理解が必要な場合のみ

### 4. ファセット再利用

カスタムファセットをビルトインで代替し、セクションマップを削減する。

**手順:**
1. セクションマップ内のカスタムファセットを列挙
2. 各カスタムファセットの内容を読み込む
3. ビルトインファセットと比較し、類似度を評価
4. 代替可能な場合はbare name参照に置換

**ビルトイン置換例:**
```yaml
# Before: カスタムファセットをセクションマップで参照
personas:
  my-coder: ../personas/my-coder.md
movements:
  - name: implement
    persona: my-coder

# After: ビルトインのbare name参照
movements:
  - name: implement
    persona: coder    # ビルトインを直接参照
```

**置換不可の条件:**
- ビルトインにないドメイン知識を含むペルソナ
- プロジェクト固有の判定基準を含むポリシー
- 独自の手順を含むインストラクション

### 5. ループ制御改善

修正ループの効率化と安全性を改善する。

| 最適化 | 内容 |
|--------|------|
| loop_monitors追加 | review→fixサイクルにloop_monitorがない場合に追加 |
| threshold調整 | 閾値が高すぎる/低すぎる場合に適正値を提案 |
| ABORT条件追加 | 失敗時のABORT遷移がない場合に追加 |
| max_movements調整 | ムーブメント数に対してmax_movementsが過大/過小な場合に調整 |

**threshold推奨値:**
- review→fix サイクル: 3回
- implement→test サイクル: 2回

### 6. 並列化提案

逐次実行されているが並列化可能なムーブメントを検出する。

**並列化条件:**
- 互いの出力を参照しない（pass_previous_response不要）
- 同じ前ムーブメントのレポートを入力とする
- 独立したレポートを出力する

```yaml
# Before: 逐次レビュー
- name: arch-review
  ...
  rules:
    - condition: done
      next: qa-review
- name: qa-review
  ...

# After: 並列レビュー
- name: reviewers
  parallel:
    - name: arch-review
      ...
      rules:
        - condition: approved
        - condition: needs_fix
    - name: qa-review
      ...
      rules:
        - condition: approved
        - condition: needs_fix
  rules:
    - condition: all("approved")
      next: supervise
    - condition: any("needs_fix")
      next: fix
```

### 7. ログベース最適化

実行ログ（`.takt/logs/{sessionId}.jsonl`）を分析し、実データに基づく最適化を行う。

**ログの場所:**
- セッションログ: `.takt/logs/{sessionId}.jsonl`（NDJSON形式）
- 最新セッション: `.takt/logs/latest.json` で参照可能

**NDJSONレコード型:**

| レコード | 主要フィールド | 最適化への活用 |
|---------|--------------|---------------|
| `piece_start` | `task`, `pieceName`, `startTime` | 実行パターンの特定 |
| `step_start` | `step`, `persona`, `iteration` | ムーブメント実行頻度 |
| `step_complete` | `step`, `status`, `matchedRuleIndex`, `matchedRuleMethod` | ルールマッチ分析 |
| `phase_start` | `step`, `phase`(1/2/3), `phaseName` | フェーズ別分析 |
| `phase_complete` | `step`, `phase`, `status`, `content`, `error` | フェーズ別ボトルネック |
| `piece_complete` | `iterations`, `endTime` | 総イテレーション数 |
| `piece_abort` | `iterations`, `reason`, `endTime` | 失敗パターン分析 |

**分析項目と最適化:**

| 分析 | 方法 | 最適化アクション |
|------|------|----------------|
| ループホットスポット | 同一ステップの`step_start`出現回数を集計 | loop_monitorのthreshold調整、ルール条件の見直し |
| デッドルール検出 | `matchedRuleIndex`の分布を集計し、一度もマッチしないルールを特定 | 到達不能ルールの除去 |
| ai_fallback頻度 | `matchedRuleMethod`が`ai_judge_fallback`の割合 | タグベースルールへの書き換え（コスト削減・信頼性向上） |
| ABORT率 | `piece_abort`/`piece_complete`の比率 | ABORT原因の`reason`を分析しフロー改善 |
| フェーズ別エラー | `phase_complete`の`error`フィールド | エラー頻発フェーズの特定と改善 |
| イテレーション効率 | `piece_complete.iterations` vs `max_movements` | max_movementsの適正値算出 |

**matchedRuleMethod の値と意味:**

| 値 | 意味 | 最適化観点 |
|----|------|-----------|
| `phase3_tag` | Phase 3のタグ判定で決定 | 理想的（低コスト） |
| `phase1_tag` | Phase 1出力のタグで決定 | 良好（Phase 3不要の可能性） |
| `aggregate` | parallel親のall()/any()で決定 | 正常 |
| `ai_judge` | ai()条件のAI判定で決定 | 許容（タグ化を検討） |
| `ai_judge_fallback` | 全条件をAI判定（最終手段） | 要改善（タグが出力されていない） |
| `auto_select` | 自動選択 | 正常 |

**ログ分析例:**

```
# 3回の実行ログを分析した結果:
ステップ "ai_review" の matchedRuleMethod 分布:
  phase3_tag: 1回 (33%)
  ai_judge_fallback: 2回 (67%)
→ 提案: ステータスタグが安定して出力されていない。
  インストラクションのタグ出力指示を強化するか、ルール条件テキストを簡潔にする。
```

**複数ログの統合分析:**

複数のセッションログが提供された場合、統計的に信頼性の高い最適化を提案する。
- 3回以上の実行データ: パターンの確認に十分
- 1回の実行データ: 参考情報として扱い、静的分析を優先

## ワークフロー

### Step 1: 対象の特定と読み込み

対象のピースYAMLを特定し、関連ファセットを全て読み込む。

```
探索順序:
1. ユーザー指定のパス
2. ~/.takt/pieces/ 内のカスタムピース
3. .takt/pieces/ 内のプロジェクトピース
```

読み込む内容:
- ピースYAML全体
- セクションマップの全ファセットファイル
- ビルトインファセット（比較用）
- 実行ログ（ユーザーが提供した場合）: `.takt/logs/*.jsonl`

### Step 2: 最適化プラン作成

各カテゴリの最適化可能性を評価し、プランを提示する。

```markdown
# 最適化プラン: {ピース名}

## 分析ソース
- 静的分析: ピースYAML + ファセット{N}件
- ログ分析: {N}セッション（提供された場合）

## 推定効果
- トークン削減: 約{N}%
- ムーブメント数: {before} → {after}
- ファイル数: {before} → {after}

## 最適化項目
| # | カテゴリ | 対象 | 内容 | 根拠 | リスク |
|---|---------|------|------|------|--------|
| 1 | トークン削減 | persona/coder | 120行→80行に圧縮 | 静的 | 低 |
| 2 | ビルトイン置換 | persona/my-reviewer | → architecture-reviewer | 静的 | 低 |
| 3 | ルール簡素化 | ai_review | ai_fallback 67% → タグ化 | ログ | 低 |
| 4 | 並列化 | arch-review + qa-review | 逐次→並列 | 静的 | 中 |
```

**ユーザーに確認**: プランを提示し、実行する項目の承認を得る。

**判定フロー:**
- 最適化項目が0件 → 「既に十分最適化されています」を報告して終了
- ユーザーが一部承認 → 承認項目のみStep 3で実行
- ユーザーが全却下 → 終了

### Step 3: 最適化の実行

承認された項目を実行する。

**実行順序（依存関係順）:**
1. ファセット圧縮・統合（ファイル内容の変更）
2. ビルトイン置換（セクションマップの変更）
3. ムーブメント統合（YAML構造の変更）
4. ルール簡素化（ルール条件の変更）
5. ループ制御改善（loop_monitors追加）
6. 並列化（ムーブメント構造の大幅変更）

### Step 4: 整合性検証

最適化後のファイル群の整合性を確認する。

- [ ] セクションマップのキーとムーブメント内参照が一致
- [ ] セクションマップのパスが実在するファイルを指す
- [ ] `initial_movement`が`movements`配列内に存在
- [ ] 全ルールの`next`が有効な遷移先
- [ ] parallel親ルールが`all()`/`any()`を使用
- [ ] parallelサブステップのルールに`next`がない
- [ ] ファセットがサイズ上限内
- [ ] 削除したファセットへの参照が残っていない

### Step 5: 結果レポート

```markdown
# 最適化結果: {ピース名}

## サマリー
- トークン削減: 約{N}%（推定）
- ムーブメント数: {before} → {after}
- ファイル数: {before} → {after}

## 変更一覧
| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | pieces/my-piece.yaml | ムーブメント統合、ルール簡素化 |
| 2 | personas/coder.md | 120行→80行に圧縮 |
| 3 | (削除) personas/my-reviewer.md | ビルトインに置換 |

## 削除ファイル
- personas/my-reviewer.md（→ ビルトイン architecture-reviewer で代替）

## 注意事項
{最適化による動作変更の可能性がある場合に記載}
```

## バリデーション

作成・編集したファイルは `validate-takt-files.sh` で機械的に検証できる:

```bash
bash .agent/skills/takt-optimize/scripts/validate-takt-files.sh
```

検証項目:
- **ピース YAML**: 必須フィールド（`name`/`initial_movement`/`movements`）、`initial_movement` の movement 参照、ファセットファイル参照の実在
- **ファセット .md**: 空チェック、persona/policy/knowledge は `# 見出し` 必須、instruction/output-contract は内容存在

オプション `--pieces` / `--facets` で対象を絞り込み可能。
