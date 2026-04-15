---
name: takt-workflow-builder
description: >
  TAKTワークフロー（ワークフローYAML）の作成・カスタマイズスキル。Faceted Prompting
  （Persona/Policy/Instruction/Knowledge/Output Contract）に基づくファセット群の
  生成を含む。references/taktにあるtaktのソースコード・ドキュメント・ビルトインワークフロー群を
  参照資料として活用する。ユーザーの要件をヒアリングし、step構成、ルール設計、
  ファセットファイル生成を一括で行う。
  トリガー：「ワークフローを作りたい」「ワークフローを定義」「taktのワークフローを作成」
  「新しいtaktワークフローを作って」「takt workflow」「ワークフローYAML」
---

# TAKT Workflow Builder

TAKTワークフロー（ワークフローYAML）とその関連ファセットファイルを作成する。

> **前提 takt バージョン**: v0.35.4

## 参照資料

taktのコードベースとドキュメントは `references/takt/` にある。必要に応じて以下を参照する。

| 資料 | パス | 用途 |
|------|------|------|
| YAMLスキーマ | `references/takt/builtins/skill/references/yaml-schema.md` | ワークフローYAMLの構造定義 |
| エンジン仕様 | `references/takt/builtins/skill/references/engine.md` | プロンプト構築・ルール評価の詳細 |
| Faceted Prompting | `references/takt/docs/faceted-prompting.ja.md` | 5ファセット設計の理論 |
| ビルトインワークフロー | `references/takt/builtins/ja/workflows/` | 実例（default.yaml, dual.yaml等） |
| スタイルガイド | `references/takt/builtins/ja/STYLE_GUIDE.md` | ファセット記述規約 |
| ペルソナガイド | `references/takt/builtins/ja/PERSONA_STYLE_GUIDE.md` | ペルソナ記述規約 |
| ビルトインファセット | `references/takt/builtins/ja/facets/{personas,policies,instructions,knowledge,output-contracts}/` | 既存ファセット例 |

**重要**: ワークフロー作成前に `references/takt/builtins/ja/workflows/default.yaml` を読み、プロジェクトのパターンを把握する。

## ワークフロー

### Step 1: 要件ヒアリング

以下を確認する（不明な点はユーザーに質問）:

1. **目的**: このワークフローで何を達成するか
2. **ステップ構成**: どんなステップが必要か（plan→implement→review→supervise等）
3. **レビュー体制**: 並列レビューの有無、レビュアーの種類
4. **ループ制御**: 修正ループの有無と閾値
5. **出力先**: ワークフローとファセットの配置場所（デフォルト: `~/.takt/workflows/`）

### Step 2: ビルトイン参照

ビルトインワークフロー（`references/takt/builtins/ja/workflows/`）から類似パターンを探す。

| ビルトイン | 構成 | 用途 |
|-----------|------|------|
| `default.yaml` | plan→write_tests→implement→ai_review→reviewers(arch+qa)→fix→supervise | 標準開発 |
| `dual.yaml` | plan→write_tests→team_leader_implement→ai_review→reviewers(2段階)→fix→supervise | フロントエンド＋バックエンド |
| `backend.yaml` | plan→write_tests→implement→ai_review→reviewers→fix→supervise | バックエンド特化 |
| `backend-cqrs.yaml` / `backend-cqrs-mini.yaml` | CQRS+ESバックエンド開発 | CQRS/ES特化 |
| `frontend.yaml` | plan→write_tests→implement→ai_review→reviewers→fix→supervise | フロントエンド特化 |
| `backend-mini.yaml` / `dual-mini.yaml` / `dual-cqrs-mini.yaml` / `frontend-mini.yaml` | plan→implement→supervise | 最小構成 |
| `review-default.yaml` / `review-backend.yaml` / `review-dual.yaml` / `review-frontend.yaml` | レビューワークフロー | コードレビュー |
| `review-fix-default.yaml` / `review-fix-backend.yaml` / `review-fix-dual.yaml` / `review-fix-frontend.yaml` | レビュー→修正ループ | レビュー＋修正 |
| `takt-default.yaml` / `review-takt-default.yaml` / `review-fix-takt-default.yaml` | TAKT開発用 | TAKT開発 |
| `audit-architecture.yaml` / `audit-architecture-backend.yaml` / `audit-architecture-dual.yaml` / `audit-architecture-frontend.yaml` | アーキテクチャ監査 | 品質監査 |
| `audit-e2e.yaml` / `audit-security.yaml` / `audit-unit.yaml` | E2E/セキュリティ/ユニットテスト監査 | 品質監査 |
| `terraform.yaml` | インフラストラクチャ | Terraform |
| `research.yaml` / `deep-research.yaml` | 調査・研究 | リサーチ |
| `magi.yaml` / `compound-eye.yaml` | 特殊構成 | 多視点分析 |

**再利用判断**: ビルトインのファセットで足りる場合はカスタムファセットを作らない。

### Step 3: ワークフローYAML作成

以下の構造でYAMLを作成する。

```yaml
name: workflow-name
description: ワークフローの説明
max_steps: 30
initial_step: plan

# ワークフロー全体の設定
workflow_config:
  provider_options:
    codex:
      network_access: true

# セクションマップ（カスタムファセットがある場合のみ）
personas:
  custom-role: ../personas/custom-role.md
policies:
  custom-policy: ../policies/custom-policy.md
instructions:
  custom-step: ../instructions/custom-step.md
knowledge:
  domain: ../knowledge/domain.md
report_formats:
  custom-report: ../output-contracts/custom-report.md

steps:
  - name: plan
    edit: false
    persona: planner          # ビルトイン参照（bare name）
    knowledge: architecture
    provider_options:
      claude:
        allowed_tools:
          - Read
          - Glob
          - Grep
          - Bash
          - WebSearch
          - WebFetch
    instruction: plan
    output_contracts:
      report:
        - name: 00-plan.md
          format: plan
    rules:
      - condition: 要件が明確で実装可能
        next: implement
      - condition: 要件が不明確、情報不足
        next: ABORT

  - name: implement
    edit: true
    persona: coder
    policy: [coding, testing]
    session: refresh
    instruction: implement
    rules:
      - condition: 実装完了
        next: review
```

**互換 alias**: `movements` は `steps` と同義、`initial_movement` は `initial_step` と同義、`max_movements` は `max_steps` と同義。新規作成では正式名を使う。

#### Parallel Step 例

```yaml
  - name: reviewers
    parallel:
      - name: arch-review
        edit: false
        persona: architecture-reviewer
        policy: review
        instruction: review-arch
        output_contracts:
          report:
            - name: 05-architect-review.md
              format: architecture-review
        rules:
          - condition: approved
          - condition: needs_fix
      - name: qa-review
        edit: false
        persona: qa-reviewer
        policy: [review, qa]
        instruction: review-qa
        rules:
          - condition: approved
          - condition: needs_fix
    rules:
      - condition: all("approved")
        next: supervise
      - condition: any("needs_fix")
        next: fix
```

**注意**: サブステップの `rules` は結果分類用。`next` は無視され、親の `rules` が遷移先を決定する。

#### 設計判断ガイド

| 判断ポイント | 基準 |
|-------------|------|
| `edit: true/false` | コード変更するステップのみtrue |
| `session: refresh` | 実装系ステップで新規セッション開始 |
| `pass_previous_response: false` | レビュー結果を直接読ませたくない場合 |
| `required_permission_mode` | edit権限が必要な場合に `edit` を指定 |
| `provider_options.claude.allowed_tools` | ステップ単位でClaudeの使用ツールを制限 |

#### ルール設計

| ルール種別 | 記法 | 使い分け |
|-----------|------|----------|
| テキスト条件 | `"条件文"` | Phase 3タグ判定（推奨） |
| AI判定 | `ai("条件")` | タグ判定が不適な場合 |
| 全一致 | `all("条件")` | parallelの親のみ |
| いずれか | `any("条件")` | parallelの親のみ |

特殊遷移先: `COMPLETE`（成功終了）、`ABORT`（失敗終了）

### Step 4: ファセットファイル作成

カスタムファセットが必要な場合、以下の規約で作成する。

#### ディレクトリ構造

```
~/.takt/
├── workflows/
│   └── my-workflow.yaml
├── personas/
│   └── custom-role.md
├── policies/
│   └── custom-policy.md
├── instructions/
│   └── custom-step.md
├── knowledge/
│   └── domain.md
└── output-contracts/
    └── custom-report.md
```

#### ファセット作成規約

**Persona**: system promptに配置。identity + 専門性 + 境界。

```markdown
# {ロール名}

{1-2文のロール定義}

## 役割の境界

**やること:**
- ...

**やらないこと:**
- ...（担当エージェント名を明記）

## 行動姿勢

- ...
```

**Policy**: 複数ステップで共有する行動規範。

```markdown
# {ポリシー名}

## 原則

| 原則 | 基準 |
|------|------|
| ... | REJECT / APPROVE 判定 |

## 禁止事項

- ...
```

**Instruction**: ステップ固有の手順。命令形で記述。`{task}`, `{previous_response}`は自動注入されるため不要。

**Knowledge**: 判断の前提となる参照情報。記述的（「こうなっている」）。

**Output Contract**: レポートの構造定義。

````markdown
```markdown
# {レポートタイトル}

## 結果: APPROVE / REJECT

## サマリー
{1-2文で要約}

## 詳細
| 観点 | 結果 | 備考 |
|------|------|------|
```
````

詳細なスタイル規約は `references/takt/builtins/ja/STYLE_GUIDE.md` を参照。

### Step 5: Loop Monitor（任意）

修正ループが想定される場合に設定する。

```yaml
loop_monitors:
  - cycle: [ai_review, ai_fix]
    threshold: 3
    judge:
      persona: supervisor
      instruction: loop-monitor-ai-fix               # ビルトインファセット参照
      rules:
        - condition: 健全（進捗あり）
          next: ai_review
        - condition: 非生産的（改善なし）
          next: reviewers
  - cycle: [reviewers, fix]
    threshold: 3
    judge:
      persona: supervisor
      instruction: loop-monitor-reviewers-fix        # ビルトインファセット参照
      rules:
        - condition: 健全（指摘数が減少、修正が反映されている）
          next: reviewers
        - condition: 非生産的（同じ指摘が繰り返される）
          next: supervise
```


### Step 6: 検証

作成したファイルの整合性を確認する:

- [ ] セクションマップのキーとステップ内の参照が一致
- [ ] セクションマップのパスが実際のファイル位置と一致（ワークフローYAMLからの相対パス）
- [ ] ビルトイン参照（bare name）とカスタム参照（セクションマップキー）が混在していないか
- [ ] `initial_step` が `steps` 配列内に存在
- [ ] 全ステップの `rules.next` が有効な遷移先（他のステップ名 or COMPLETE/ABORT）
- [ ] parallel ステップの親ルールが `all()` / `any()` を使用
- [ ] parallel サブステップのルールに `next` がない（親が制御）

## バリデーション

作成・編集したファイルは `validate-takt-files.sh` で機械的に検証できる:

```bash
bash .agents/skills/takt-workflow-builder/scripts/validate-takt-files.sh
```

検証項目:
- **ワークフロー YAML**: 必須フィールド（`name`/`initial_step`/`steps`）、`initial_step` の step 参照、ファセットファイル参照の実在
- **ファセット .md**: 空チェック、persona/policy/knowledge は `# 見出し` 必須、instruction/output-contract は内容存在

オプション `--pieces` / `--facets` で対象を絞り込み可能。
