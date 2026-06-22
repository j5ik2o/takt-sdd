---
id: kiro-discovery-ai-antipattern-fix-result
kind: output-contract
name: Kiro Discovery AI Antipattern Fix Result
version: 1.0.0
extends: validation
---

{extends: validation}

# Kiro Discovery AI Antipattern Fix Result

`report-discovery` が実行される前に、Kiro discovery artifacts の AI antipattern findings を修正した結果を報告する。

## Required Machine Fields

- `STATUS`: `FIXED`、`NO_FIX_NEEDED`、`NEED_REPLAN`、`BLOCKED` のいずれか。
- `finding_decisions`: `kiro-discovery-ai-antipattern-review.md` の各 finding を列挙し、fixed、not applicable、requires replan、blocked のいずれかで示す。
- `changed_files`: この fix pass で変更した discovery artifact files、または `none`。
- `scope_guard`: current discovery artifact boundary のみを触った確認。
- `validation_evidence`: status を裏付ける checks、commands、file-level evidence。
- `no_fix_rationale`: `STATUS` が `NO_FIX_NEEDED` の場合に必須。finding-level evidence を含める。
- `missing_context`: `STATUS` が `NEED_REPLAN` または `BLOCKED` の場合に必須。
- `summary`: concise human-readable result。

## Status Semantics

- `FIXED`: 少なくとも 1 件の finding を修正した。gate は AI antipattern review を再実行する。
- `NO_FIX_NEEDED`: すべての finding が不適用または concrete evidence により既に解消済みである。
- `NEED_REPLAN`: current discovery artifact boundary 内では安全に修正できない。
- `BLOCKED`: 必要な information、files、permissions が利用できない。

report filename は `kiro-discovery-ai-antipattern-fix.md` でなければならない。first-pass `kiro-discovery-ai-antipattern-review.md` に blocking findings がない場合、この report は optional fix report として不在でもよい。
