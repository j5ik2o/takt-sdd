---
id: kiro-ai-antipattern-fix-implementation
kind: instruction
name: Kiro AI Antipattern Fix Implementation
version: 1.0.0
Full custom skill reason: TAKT-side reusable AI antipattern gate instruction; no upstream Kiro skill owns this callable subworkflow role.
---

{extends: fix}

# Kiro AI Antipattern Fix Implementation

Full custom reason: TAKT-side reusable AI antipattern gate instruction; no upstream Kiro skill owns this callable subworkflow role.

現在選択されている Kiro 実装タスクについて、AI アンチパターン finding を是正または判定する。対象は selected task に限定する。

## Inputs

- `kiro-task-implementation-result.md` を読み、選択中タスク、Implementation Notes、変更ファイル、実装ステップの検証根拠を把握する。
- `kiro-ai-antipattern-review.md` を読み、レポート内のすべての finding を扱う。
- `.kiro/specs/<spec-name>/` 配下の現在の spec ファイルを、タスク境界の正とする。

## Scope

- 選択中タスクと AI アンチパターン finding の是正に必要なコードまたはテストだけを変更する。
- `tasks.md`、roadmap marker、spec 進捗、実装進捗アーティファクトを更新しない。
- 別の Kiro タスクを開始しない。
- WebSearch / WebFetch は使わない。リポジトリ内ファイルとローカルの TAKT/Kiro 資産から学ぶ。

## Fix Rules

- 幻覚された挙動、根拠のない主張、リポジトリ根拠不足、タスク境界逸脱を取り除く、小さく直接的な是正を優先する。
- finding が `implementation_scope_mismatch`、unscoped git diff、current dirty worktree 全体、または `baseline_dirty_files` 外の unrelated dirty file を対象にしている場合は、selected task の局所修正として扱わず `STATUS: NEED_REPLAN` を報告する。
- finding が妥当で、選択中タスク内で是正できる場合は修正し、`STATUS: FIXED` を報告する。
- コード変更が不要な場合は、各 finding が不適用または解消済みである finding-level evidence を示したうえでのみ `STATUS: NO_FIX_NEEDED` を報告する。
- finding の解決に plan、requirements、design、task decomposition の変更が必要な場合は `STATUS: NEED_REPLAN` を報告する。
- 必要な文脈が不足している場合は `STATUS: BLOCKED` を報告する。

## Output

`kiro-ai-antipattern-fix-result` contract に従って `kiro-ai-antipattern-fix.md` を書く。
