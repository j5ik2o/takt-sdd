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
| `.agent/skills/` | takt スキルの実体（takt-analyze, takt-facet, takt-optimize, takt-piece, takt-task） |
| `.claude/skills/`, `.codex/skills/` | `.agent/skills/` へのシンボリックリンク |
| `references/takt/` | takt ビルトインとドキュメント（参照専用） |
| `references/okite-ai/` | AI ルール集（参照専用） |
| `installer/` | `npx create-takt-sdd` のインストーラ本体（TypeScript） |
| `.kiro/specs/` | SDD の出力先（requirements.md / design.md / tasks.md 等） |
| `.kiro/steering/` | プロジェクトメモリ（product.md / tech.md / structure.md 等） |

## SDD フェーズ

```
sdd-requirements → sdd-validate-gap → sdd-design → sdd-validate-design → sdd-tasks → sdd-impl → sdd-validate-impl
```

フルオートピース `sdd` で全フェーズを一括実行できる。各フェーズは `npm run sdd:{phase} -- "..."` で個別実行も可能。

## インストーラの仕組み

- `installer/src/install.ts` が本体。`TAKT_SKILLS` 配列に列挙したスキルを `.agent/skills/` にコピーし、`.claude/skills/` と `.codex/skills/` にシンボリックリンクを作成する。
- スキルディレクトリ内のファイルは `syncDirectory` で再帰的にコピーされる。

# 基本原則

- シンプルさの優先: すべての変更を可能な限りシンプルに保ち、コードへの影響範囲を最小限に抑える。
- 妥協の排除: 根本原因を特定すること。一時しのぎの修正は行わず、シニア開発者としての基準を維持する。
- 影響の最小化: 必要な箇所のみを変更し、新たなバグの混入を徹底的に防ぐ。
