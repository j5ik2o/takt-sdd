# Steeringテンプレート参照

steeringファイル生成時に参照するテンプレート構造。

## コアファイルのテンプレート

### product.md

```markdown
# Product Overview

[プロダクトの簡潔な説明と対象ユーザー]

## Core Capabilities

[3-5の主要機能。網羅的なリストではない]

## Target Use Cases

[このプロダクトが対処する主要シナリオ]

## Value Proposition

[このプロダクトの独自性・価値]
```

### tech.md

```markdown
# Technology Stack

## Architecture

[高レベルのシステム設計アプローチ]

## Core Technologies

- **Language**: [e.g., TypeScript, Rust]
- **Framework**: [e.g., React, Actix-web]
- **Runtime**: [e.g., Node.js 20+]

## Key Libraries

[開発パターンに影響する主要ライブラリのみ]

## Development Standards

### Type Safety
[e.g., TypeScript strict mode]

### Code Quality
[e.g., ESLint, clippy]

### Testing
[e.g., Jest, cargo test]

## Common Commands

```bash
# Dev: [command]
# Build: [command]
# Test: [command]
```

## Key Technical Decisions

[重要なアーキテクチャ上の選択とその理由]
```

### structure.md

```markdown
# Project Structure

## Organization Philosophy

[feature-first, layered, domain-driven 等]

## Directory Patterns

### [パターン名]
**Location**: `/path/`
**Purpose**: [何がここに属するか]
**Example**: [簡潔な例]

## Naming Conventions

- **Files**: [パターン]
- **Components**: [パターン]
- **Functions**: [パターン]

## Import Organization

[インポートパターンの例]

## Code Organization Principles

[主要なアーキテクチャパターンと依存ルール]
```

## テンプレートの保存場所

テンプレートファイルは `.takt/knowledge/steering-template-files/` に格納される:
- `product.md` - プロダクト概要テンプレート
- `tech.md` - 技術スタックテンプレート
- `structure.md` - プロジェクト構造テンプレート

カスタムステアリングテンプレートは `.takt/knowledge/steering-custom-template-files/` に格納される。
