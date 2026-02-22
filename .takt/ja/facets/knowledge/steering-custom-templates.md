# カスタムSteeringテンプレート参照

カスタムsteeringファイル生成時に参照するテンプレート情報。

## テンプレート一覧

テンプレートは `.takt/knowledge/steering-custom-template-files/` に格納される。

| テンプレート | ドメイン | 主な内容 |
|-------------|---------|---------|
| architecture.md | アーキテクチャ | アーキテクチャスタイル、レイヤー境界、依存ルール、並行モデル |
| api-standards.md | API設計 | エンドポイントパターン、リクエスト/レスポンス形式、ステータスコード、認証、バージョニング |
| testing.md | テスト戦略 | テスト構成、テスト種別、AAA構造、モッキング、カバレッジ |
| security.md | セキュリティ | 認証パターン、入力検証、シークレット管理 |
| database.md | データベース | スキーマ設計、マイグレーション、クエリパターン |
| error-handling.md | エラー処理 | エラー型、ロギング、リトライ戦略 |
| authentication.md | 認証 | 認証フロー、権限管理、セッション管理 |
| deployment.md | デプロイ | CI/CD、環境構成、ロールバック手順 |

## テンプレートの共通構造

各テンプレートは以下の構造に従う：

```markdown
# [トピック名]

[Purpose: 1行の目的説明]

## Philosophy
[方針・原則 3-5項目]

## [ドメイン固有セクション]
[パターンとコード例]

## [ドメイン固有セクション]
[パターンとコード例]

---
_Focus on patterns and decisions, not exhaustive lists._
```

## テンプレートなしの場合のフォールバック構造

テンプレートが存在しないトピックでは、以下の構造で生成する：

```markdown
# [トピック名]

## Philosophy
[方針・原則]

## Patterns
[パターン・規約とコード例]

## Decisions
[技術的決定とその理由]

---
_Focus on patterns and decisions._
```
