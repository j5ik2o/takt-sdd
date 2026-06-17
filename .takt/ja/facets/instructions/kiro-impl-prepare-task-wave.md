{extends: fix}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 3: Execute Implementation` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Task Wave Preparation Adapter

## Kiro 固有差分

計画済み `(P)` task wave のために isolated git worktrees を準備する。この step は wave isolation state だけを作成し、code implementationも `tasks.md` 更新も行わない。

この step は `git branch` と `git worktree add` によって `.git` 配下の ref を作成するため、host-level の git metadata write が必要。workflow step は `required_permission_mode: full` で実行し、implementation part は `edit` のままにする。

## Preparation rules

1. `kiro-implementation-dispatch.md` から `dispatch_mode: wave`、`wave_id`、`wave_tasks` を必須にする。
2. 各wave taskごとに `.takt/worktrees/kiro-impl/<feature>/<task-id>/` 配下の isolated worktree を作る。
3. 対応する `task_worktree` 専用に、branch name `kiro-impl/<feature>/<task-id>` を作成または使用する。
4. branchまたはworktreeがunknown contentsで既に存在する、base revisionが曖昧、taskに `_Boundary:_` または `_Depends:_ none` がない場合は `STATUS: BLOCKED` で止める。
5. `baseline_dirty_files` を保持し、selected task diffには含めない。
6. taskごとに `selected_task`、`task_worktree`、`task_branch`、`_Boundary:_`、validation command hintsを持つmanifest entryを出力する。
7. final report の `wave_tasks` に manifest entry list を保持し、validation summary やworktree-only listで置き換えない。
8. source files、task checkboxes、blocker notes、`Implementation Notes` は編集しない。

## Output mapping

- `dispatch_mode: wave`、`wave_tasks`、`wave_worktrees prepared` を持つ `STATUS: READY_FOR_REVIEW` は `execute-task-wave` へ進む。
- `selected_task` と `blocker_note_required: true` を持つ `STATUS: BLOCKED` はprogress/blocker handlingへ進む。
- それ以外の `STATUS: BLOCKED` または `STATUS: NEEDS_CONTEXT` はTeamLeader execution前にwaveを停止する。
