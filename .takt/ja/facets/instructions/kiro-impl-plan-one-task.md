---
extends_skill: kiro-impl
extends_skill_section: "## Step 2: Select Tasks & Determine Mode"
---

{extends: plan}

# Kiro One Task Planning Adapter

## Kiro 固有差分

このTAKT iterationで実行する one task だけを計画する。このfacetは `kiro-impl` のtask selectionをworkflow stateへ写像するだけで、code editも `tasks.md` 更新も行わない。

## Input artifacts

- `ready_for_implementation` を持つ `.kiro/specs/<feature>/spec.json`。
- `.kiro/specs/<feature>/requirements.md`、`design.md`、`tasks.md`。
- task annotation の `_Boundary:_`、`_Depends:_`、numeric requirement coverage、blocker notes、checkbox state。
- 利用可能な場合はstatus validationのread-only readiness signal。

## Planning rules

1. `ready_for_implementation` がtrueでない、approvalが不足する、required artifactsが欠ける場合はedit前に停止する。
2. `_Depends:_` が完了済みで、blocker notesが実行を止めていないunchecked taskの先頭 one task を選ぶ。
3. `_Depends:_ none` はempty dependency setとして扱う。
4. implementation planには `_Boundary:_`、`_Depends:_`、requirement numbers、selected task text、禁止する隣接scope、validation command hintsを含める。
5. task annotation不足、eligible task不在、selected task boundaryとdesign commitmentsの矛盾は `BLOCKED` として返す。

## Output mapping

workflowは one task が選択された場合だけ `execute-task` へ進む。planが `BLOCKED` を返す場合はprogress/blocker handlingへ進む。このadapterはstandalone review/debug workflowを作らない。
