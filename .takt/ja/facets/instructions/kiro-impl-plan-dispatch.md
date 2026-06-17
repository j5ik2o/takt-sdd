{extends: plan}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 2: Select Tasks & Determine Mode` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Dispatch Planning Adapter

## Kiro 固有差分

`kiro-impl` の次の実行経路を選ぶ。safe な `(P)` task wave、既存 wave の未適用 result、または既存の one task path のいずれかに分岐する。この step は read-only で、code も `tasks.md` も編集しない。

## Input artifacts

- `ready_for_implementation` を持つ `.kiro/specs/<feature>/spec.json`。
- `.kiro/specs/<feature>/requirements.md`、`design.md`、`tasks.md`。
- task annotation の `_Boundary:_`、`_Depends:_`、numeric requirement coverage、blocker notes、checkbox state、`(P)` markers。
- `kiro-task-wave-implementation-result.md`、`wave_result_refs`、`task_worktree`、`task_branch` などの previous wave reports。
- `git status --porcelain` による dispatch 時点の既存未コミット files。

## Dispatch rules

1. `ready_for_implementation` がtrueでない、approvalが不足する、required artifactsが欠ける場合はedit前に停止する。
2. unchecked task向けの未適用successful wave resultがある場合は、`wave_result_refs` を含めて `dispatch_mode: wave_apply` を返す。
3. それ以外では、unchecked executable leaf taskが2件ある最初のeligible `(P)` waveを探す。eligible peer taskが3件以上ある場合も、このwaveでは先頭2件（first two）だけを出力し、残りは後続の `plan-dispatch` に残す。
4. wave-eligible taskは `_Depends:_ none`、`_Boundary:_`、requirement numbersを持ち、blocker notesが実行を止めず、`wave_tasks` 内のpeerとboundaryが重ならない場合だけ対象にする。
5. `baseline_dirty_files` を記録し、selected task diffから除外する。
6. TeamLeader executionに安全な場合だけ、`wave_id` と `wave_tasks` を含めて `dispatch_mode: wave` を返す。
7. safeな `(P)` wave がない場合は `dispatch_mode: single` を返す。次stepは `plan-one-task` を使う。
8. concrete selected task blockerの場合だけ `selected_task` と `blocker_note_required: true` を含めて `STATUS: BLOCKED` を返す。readiness-level blockerでは `selected_task` を使わない。

## Output mapping

- `dispatch_mode: wave` を持つ `STATUS: READY_FOR_REVIEW` は `prepare-task-wave` へ進む。
- `dispatch_mode: wave_apply` を持つ `STATUS: READY_FOR_REVIEW` は `apply-wave-task` へ進む。
- `dispatch_mode: single` を持つ `STATUS: READY_FOR_REVIEW` は `plan-one-task` へ進む。
- `STATUS: BLOCKED` と `STATUS: NEEDS_CONTEXT` は既存のblocker rulesに従う。
