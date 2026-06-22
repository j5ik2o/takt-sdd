---
id: kiro-ai-antipattern-fix-result
kind: output-contract
name: Kiro AI Antipattern Fix Result
version: 1.0.0
extends: validation
---

{extends: validation}

# Kiro AI Antipattern Fix Result

通常の Kiro レビューに進む前に、AI アンチパターン指摘の是正結果を報告する。

## Required Machine Fields

- `STATUS`: `FIXED`, `NO_FIX_NEEDED`, `NEED_REPLAN`, `BLOCKED` のいずれか。
- `finding_decisions`: `kiro-ai-antipattern-review.md` の各 finding を列挙し、fixed / not applicable / requires replan / blocked を示す。
- `changed_files`: この是正パスで変更したファイル。なければ `none`。
- `scope_guard`: 選択中タスクの範囲だけを扱い、進捗更新を行っていないことの確認。
- `validation_evidence`: status を裏付けるテスト、コマンド、またはファイル単位の根拠。
- `no_fix_rationale`: `STATUS` が `NO_FIX_NEEDED` の場合は必須。finding 単位の根拠を含める。
- `missing_context`: `STATUS` が `NEED_REPLAN` または `BLOCKED` の場合は必須。
- `summary`: 人間向けの短い結果概要。

## Status Semantics

- `FIXED`: 少なくとも 1 件の finding を是正した。AI アンチパターンレビューを再実行する。
- `NO_FIX_NEEDED`: すべての finding が不適用または解消済みであることを具体的な根拠で示した。
- `NEED_REPLAN`: 現在の選択中タスク境界では安全に是正できない。
- `BLOCKED`: 必要な情報、ファイル、権限が不足している。

レポートファイル名は `kiro-ai-antipattern-fix.md` とする。
