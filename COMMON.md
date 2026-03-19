# 大前提

- 日本語でやりとりすること

# プロジェクト概要

**takt-sdd** は [takt](https://github.com/nrslib/takt) を用いた Spec-Driven Development（SDD: 仕様駆動開発）ワークフロー定義リポジトリ。
要件定義から設計・タスク分解・実装・レビュー・検証までを takt のピース（YAML ワークフロー）とファセット群で自動化する。

## 主要ディレクトリ

| パス | 内容 |
|------|------|
| `.takt/{ja,en}/pieces/` | SDD ワークフローの YAML（ピース定義） |
| `.takt/{ja,en}/facets/` | Persona / Policy / Instruction / Knowledge / Output-Contract |
| `references/okite-ai/` | AI ルール集（参照専用） |
| `installer/` | `npx create-takt-sdd` のインストーラ本体（TypeScript） |
| `.kiro/specs/` | CC-SDD の出力先（requirements.md / design.md / tasks.md 等） |
| `.kiro/steering/` | プロジェクトメモリ（product.md / tech.md / structure.md 等） |
| `openspec/` | OpenSpec の設定・変更ディレクトリ |

## SDD フェーズ

```
cc-sdd-requirements → cc-sdd-validate-gap → cc-sdd-design → cc-sdd-validate-design → cc-sdd-tasks → cc-sdd-impl → cc-sdd-validate-impl
```

フルオートピース `cc-sdd-full` で全フェーズを一括実行できる。各フェーズは `npm run cc-sdd:{phase} -- "..."` で個別実行も可能。

## OpenSpec ワークフロー

```
opsx-propose → opsx-apply → opsx-archive
```

フルオートピース `opsx-full` で全フェーズを一括実行できる。各フェーズは `npm run opsx:{phase} -- "..."` で個別実行も可能。

## インストーラの仕組み

- `installer/src/install.ts` が本体。`.takt/` のピースとファセットを配置し、`package.json` に必要な scripts と `takt` の devDependency を追加する。
- TAKT スキルは別リポジトリで提供しており、必要に応じて個別に導入する。

# 基本原則

- シンプルさの優先: すべての変更を可能な限りシンプルに保ち、コードへの影響範囲を最小限に抑える。
- 妥協の排除: 根本原因を特定すること。一時しのぎの修正は行わず、シニア開発者としての基準を維持する。
- 影響の最小化: 必要な箇所のみを変更し、新たなバグの混入を徹底的に防ぐ。
