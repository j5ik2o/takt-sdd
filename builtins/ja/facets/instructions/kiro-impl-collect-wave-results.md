{extends: implement-after-tests}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 3: Execute Implementation` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Task Wave Result Collection Adapter

## Kiro 固有差分

TeamLeader part 完了後に実装結果を収集する。この step は通常の parent step であり、TeamLeader part ではない。prepared worktrees を読み、wave implementation result report を出力する。code implementation、main worktree へのapply、`tasks.md` 更新は行わない。

## Collection rules

1. `kiro-task-wave-prepare.md` から `dispatch_mode: wave`、`wave_id`、`wave_tasks`、`task_worktree`、`task_branch`、`_Boundary:_` を必須にする。
2. `kiro-task-wave-prepare.md` がsummary化されている場合は、同じ Report Directory のtimestamp付き `kiro-task-wave-prepare.md.*` backupから最新のmanifest entry listを復元する。
3. 各prepared worktreeについて `git -C <task_worktree> status --porcelain`、`git -C <task_worktree> diff --name-only --`、`git -C <task_worktree> ls-files --others --exclude-standard -- <boundary>`、boundary file content checksでfilesystem evidenceを検査する。
4. part outputはsecondary evidenceとしてだけ扱う。filesystem evidence がboundary fileのready状態を証明する場合、part outputの欠落やtruncationだけで `NEEDS_CONTEXT` にしてはならない。
5. 利用可能な場合は、current run の `context/previous_responses/execute-task-wave.*.md` と `context/previous_responses/latest.md` を読み、part summaries を復元する。ただし filesystem evidence が十分な場合は必須にしない。
6. filesystem evidence と validation evidence が通っている場合、`wave_part_status: READY_FOR_REVIEW` と `wave_part_status: COMPLETE` の両方を successful part status として扱う。
7. part outputが欠落または矛盾する場合は、prepared manifest entry の `task_branch` と `_Boundary:_` を使う。
8. `wave_result_refs` entriesには `selected_task`、`task_worktree`、`task_branch`、`changed_files`、`validation_evidence`、`RED_PHASE_OUTPUT`、`wave_part_status`、`missing_context` を含める。
9. 少なくとも1つのprepared worktreeにboundary内のchanged filesとfresh validation evidenceがあれば `STATUS: READY_FOR_REVIEW` を返す。manifestまたはfilesystem evidenceを復元できない場合だけ `STATUS: NEEDS_CONTEXT` を返す。filesystem evidenceによりtaskが進めないと証明できる場合だけ `STATUS: BLOCKED` を返す。
10. source files、task checkboxes、blocker notes、`Implementation Notes` は編集しない。

## Status Report

- `STATUS`: `READY_FOR_REVIEW`、`BLOCKED`、`NEEDS_CONTEXT` のいずれか。
- `dispatch_mode`: `wave`。
- `wave_result_refs`: 収集したpart results。successful entry は `wave_part_status: READY_FOR_REVIEW` または `wave_part_status: COMPLETE` を持てる。
- `changed_files`、`validation_evidence`、`RED_PHASE_OUTPUT`: filesystem checks と part summaries から復元した証跡。

## Output mapping

`kiro-implementation-result` report formatを使う。`dispatch_mode: wave` と `wave_result_refs` を持つ `STATUS: READY_FOR_REVIEW` は `apply-wave-task` へ進む。
