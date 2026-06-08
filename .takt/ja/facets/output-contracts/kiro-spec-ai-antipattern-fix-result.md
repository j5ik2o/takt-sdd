---
id: kiro-spec-ai-antipattern-fix-result
kind: output-contract
name: Kiro Spec AI Antipattern Fix Result
version: 1.0.0
extends: validation
---

{extends: validation}

# Kiro Spec AI Antipattern Fix Result

通常の domain review step の前に、generated Kiro spec draft の AI antipattern findings を修正した結果を報告する。

## Required Machine Fields

- `STATUS`: `FIXED`、`NO_FIX_NEEDED`、`NEED_REPLAN`、`BLOCKED` のいずれか。
- `finding_decisions`: `kiro-spec-ai-antipattern-review.md` の各 finding を列挙し、fixed、not applicable、requires replan、blocked のいずれかで示す。
- `changed_files`: この fix pass で変更した spec artifact files、または `none`。
- `scope_guard`: current spec artifact boundary だけに触れたことの確認。
- `validation_evidence`: status を裏付ける checks、commands、file-level evidence。
- `no_fix_rationale`: `STATUS` が `NO_FIX_NEEDED` の場合に必須。finding-level evidence を含める。
- `missing_context`: `STATUS` が `NEED_REPLAN` または `BLOCKED` の場合に必須。
- `summary`: concise human-readable result。

## Status Semantics

- `FIXED`: 少なくとも 1 つの finding を修正し、AI antipattern review を再実行する必要がある。
- `NO_FIX_NEEDED`: すべての finding が concrete evidence により inapplicable または already resolved と示されている。
- `NEED_REPLAN`: issue を current spec artifact boundary 内で安全に修正できない。
- `BLOCKED`: required information、files、permissions が利用できない。

report filename は `kiro-spec-ai-antipattern-fix.md` でなければならない。
