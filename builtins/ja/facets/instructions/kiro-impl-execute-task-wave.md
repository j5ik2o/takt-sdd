{extends: implement-after-tests}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-impl` または `/kiro-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-impl` または `/kiro-impl` の `## Step 3: Execute Implementation` section をこの step の source of truth として適用する。
追加で `## Feature Flag Protocol` section も読む。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro TeamLeader Task Wave Execution Adapter

## Kiro 固有差分

TeamLeader は prepared `(P)` tasks を isolated worktrees で実装する場合だけ使う。review、verify、`tasks.md` progress updates はparentの one-task loop に残す。

## TeamLeader execution rules

1. `kiro-task-wave-prepare.md` から `dispatch_mode: wave`、`wave_id`、`wave_tasks`、`task_worktree`、`task_branch` を必須にする。
2. wave taskごとにexactly one TeamLeader partへ分解する。追加のdiscovery、verification、review、progress-update partを作らない。
3. 各part instructionには、`kiro-task-wave-prepare.md` から具体的な `selected_task`、`task_worktree`、`task_branch`、`_Boundary:_`、validation command hintをverbatimにコピーして必ず埋め込む。
4. Do not invent wave-id-derived branch names. wave_id由来のbranch名を作らない。prepared manifestが `task_branch: kiro-impl/<feature>/<task-id>` を示す場合、part instructionはそのbranch文字列をそのまま使う。
5. 各partは割り当てられた `task_worktree` と `task_branch` の内側だけで作業する。partは `git -C <task_worktree> ...` または `<task_worktree>` 配下の絶対pathを使い、main worktreeへ書き込まない。
6. 各partはselected taskの `_Boundary:_` とimplementation planで正当化されるfileだけを、割り当てられた `task_worktree` 配下で編集する。
7. literal boundary-file taskでは、boundary fileだけを作成または更新し、task textのliteral required contentを保持し、manifestのvalidation command hintで検証する。part内で広いreviewやprogress-update作業をしない。
8. 各partはtask checkboxes、blocker notes、`Implementation Notes` を更新しない。
9. behavioral workではimplementation evidenceの前に `RED_PHASE_OUTPUT` を含める。
10. 各partは `wave_part_status`、`selected_task`、`task_worktree`、`task_branch`、`changed_files`、`validation_evidence`、`RED_PHASE_OUTPUT`、`missing_context`、`debug_context` を出力する。`READY_FOR_REVIEW` と `COMPLETE` は successful part status として扱う。
11. aggregateは `kiro-task-wave-prepare.md` をauthoritative manifestとして扱う。そのreportがsummary化されている場合は、part outputを使う前にtimestamp付きの `kiro-task-wave-prepare.md.*` backupから最新のmanifest entry listを復元する。
12. aggregateは各prepared worktreeについて `git -C <task_worktree> status --porcelain`、`git -C <task_worktree> diff --name-only --`、boundary file content checksでfilesystem evidenceを検証する。part outputはsecondary evidenceであり、`changed_files` や `validation_evidence` の唯一の根拠にしてはならない。
13. part outputがresultを省略した場合、または `task_branch` がmanifestと不一致の場合は、part-provided valueではなくprepared manifest entryの `task_branch` と `_Boundary:_` を使う。
14. TeamLeader feedbackが追加partの要否を尋ねる場合、scheduled part ids がprepared `wave_tasks` をすでにcoverしているなら `done=true` と `parts: []` を返す。refill、continuation、verification、duplicate task partを作らない。
15. aggregateはsuccessfulまたはblocked partの `wave_result_refs` を出力する。少なくとも1つのprepared worktreeにapply可能なfilesystem evidenceがあれば `STATUS: READY_FOR_REVIEW`、manifestまたはfilesystemからrequired task contextを復元できない場合は `STATUS: NEEDS_CONTEXT`、どのpartも進めない場合だけ `STATUS: BLOCKED` を返す。

## Output mapping

このstepはTeamLeader parts完了後に `collect-wave-results` へ進む。`collect-wave-results` がworktree filesystem evidenceから `kiro-implementation-result` reportを書く。parent review gatesは、1つのwave resultがmain worktreeへ適用された後だけ実行する。
