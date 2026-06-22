# 大前提

- 日本語でやりとりすること

# プロジェクト概要

**takt-sdd** は [takt](https://github.com/nrslib/takt) を用いた Spec-Driven Development（SDD: 仕様駆動開発）ワークフロー定義リポジトリ。
要件定義から設計・タスク分解・実装・レビュー・検証までを takt のピース（YAML ワークフロー）とファセット群で自動化する。

## 主要ディレクトリ

| パス | 内容 |
|------|------|
| `builtins/{ja,en}/workflows/` | package 同梱の SDD ワークフロー YAML |
| `builtins/{ja,en}/facets/` | package 同梱の Persona / Policy / Instruction / Knowledge / Output-Contract |
| `.takt/` | project-local override、`eject` 出力、ユーザー所有 config、実行状態 |
| `references/okite-ai/` | AI ルール集（参照専用） |
| `installer/` | `npx create-takt-sdd` のインストーラ本体（TypeScript） |
| `.kiro/specs/` | Kiro SDD の出力先（requirements.md / design.md / tasks.md 等） |
| `.kiro/steering/` | プロジェクトメモリ（product.md / tech.md / structure.md 等） |

## Global CLI

`takt-sdd` は npm グローバルパッケージとして提供されている。`npm install -g takt-sdd` 後、`takt-sdd <workflow>` または `takt-sdd run <workflow>` で実行する。package 同梱 workflow/facet は installed package の `builtins/{ja,en}` から直接解決される。

サポートコマンド: `kiro-discovery`, `kiro-spec-init`, `kiro-spec-requirements`, `kiro-spec-design`, `kiro-spec-tasks`, `kiro-spec-quick`, `kiro-spec-batch`, `kiro-spec-status`, `kiro-impl`, `kiro-validate-gap`, `kiro-validate-design`, `kiro-validate-impl`（kiro 12 件）。

`cc-sdd-*` workflow は v2.0.0 で退役済み。global CLI は退役済みコマンドを明示的なエラーで拒否する。  
`opsx-*` workflow も退役済みで、将来のリリースで再提供予定。global CLI は同様に拒否する。  
`.takt/config.yaml` はユーザー所有ファイル（グローバルまたはプロジェクト単位）。CLI は読み取りのみ行い、作成・変更しない。

## Kiro SDD ワークフロー

```
kiro-discovery → kiro-spec-init → kiro-spec-requirements → kiro-validate-gap → kiro-spec-design → kiro-validate-design → kiro-spec-tasks → kiro-impl → kiro-validate-impl
```

Kiro スキルでは `$kiro-discovery`, `$kiro-spec-quick`, `$kiro-spec-batch`, `$kiro-impl`, `$kiro-spec-status` を正規導線として使う。npm scripts で個別実行する場合は、`package.json` に定義された `kiro:discovery`, `kiro:spec:*`, `kiro:validate:*`, `kiro:impl`, `kiro:steering*` の実名を使う（例: `npm run kiro:spec:requirements -- "..."`）。旧 `cc-sdd:*` は v2.0.0 で互換サーフェスが終了した（npm scripts compatibility ended）。

## インストーラの仕組み

- `installer/src/install.ts` が本体。現在の initializer は guidance-only で、`.takt/` assets、manifest、`scripts/kiro-staged.mjs`、`package.json` を作成・変更しない。
- project-owned customization が必要な場合のみ、`takt-sdd eject` が `builtins/{ja,en}/workflows` と `builtins/{ja,en}/facets` を `.takt/{ja,en}/...` へコピーする。
- v1.x から update すると、退役済みワークフロー資産（cc-sdd-* / opsx-*）のうちカスタマイズされていないものを自動削除する。カスタマイズ済みの場合は警告のみ。
- TAKT スキルは別リポジトリで提供しており、必要に応じて個別に導入する。

# 基本原則

- シンプルさの優先: すべての変更を可能な限りシンプルに保ち、コードへの影響範囲を最小限に抑える。
- 妥協の排除: 根本原因を特定すること。一時しのぎの修正は行わず、シニア開発者としての基準を維持する。
- 影響の最小化: 必要な箇所のみを変更し、新たなバグの混入を徹底的に防ぐ。
