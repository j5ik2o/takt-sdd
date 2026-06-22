# AIレビュー指示

## やらないこと
- ビルドやテストを伴うコマンドを実行しない。このステップはレビュー専用であり、検証実行は `implement` / `fix` 側の責務。

## やること
1. 対象ファイルの AI 生成コード特有の問題を確認する。
   - 幻覚 API
   - 存在しない import / パス
   - 過度な抽象化
   - 未使用コード
   - 指示外の後方互換追加
2. Previous Response から前回の open findings を抽出し、各 finding に `finding_id` を付与する
3. 各 finding を `new / persists / resolved` で判定する
4. ブロッキング問題が 1 件でもあれば `REJECT`、0 件なら `APPROVE` とする

## Kiro spec generation draft mode

current workflow が `kiro-spec-ai-quality-gate` で、caller step 名に `requirements`、`design`、`tasks` の phase が含まれる場合は、対象を phase ごとに決める。

- review phase は caller step 名（例: `ai-quality-gate-tasks` / `quick-ai-quality-gate-tasks`）と caller phase result report から決める。`spec.json.phase` から review phase を推定してはならない。
- tasks phase では `spec.json.phase` が `design-generated` のままでも正常です。これは finalize-tasks 前の lifecycle state であり、design draft をレビュー対象に戻す理由にはならない。
- design phase（`ai-quality-gate-design` または `quick-ai-quality-gate-design`）では、`.kiro/specs/<feature>/design.md` がまだ存在しないことは正常です。Previous Response または caller Report Directory の `kiro-spec-design-result.md` / `kiro-spec-design-repair-result.md` / `kiro-spec-quick-design-result.md` / `kiro-spec-quick-design-repair-result.md` に含まれる `draft_artifacts.design`、または `## design.md draft` section をレビュー対象にする。
- tasks phase（`ai-quality-gate-tasks` または `quick-ai-quality-gate-tasks`）では、`.kiro/specs/<feature>/tasks.md` がまだ存在しないことは正常です。Previous Response または caller Report Directory の `kiro-spec-tasks-result.md` / `kiro-spec-tasks-repair-result.md` / `kiro-spec-quick-tasks-result.md` / `kiro-spec-quick-tasks-repair-result.md` に含まれる `draft_artifacts.tasks`、または `## draft_artifacts.tasks` / `## Draft tasks.md` section をレビュー対象にする。
- tasks phase で design.md、research.md、installer source、または untracked spec files を primary review target とした場合は scope mismatch です。`REJECT` とし、`ai_gate_scope_mismatch` を finding_id として報告する。
- draft mode では git diff、current dirty worktree、workflow/facet/script/test の未コミット差分をレビュー対象にしてはならない。これらは draft を読むための補助 evidence に限定し、review target は phase draft artifact だけに固定する。
- `git diff` を実行する場合は、必ず対象 path を `.kiro/specs/<feature>/` または caller phase result report に限定する。unscoped git diff、つまり path filter なしの `git diff` は draft mode の review target として禁止する。
- draft target が見つからない場合、git diff や `.kiro/specs/<feature>/design.md` や別 phase artifact へフォールバックしてはならない。
- requirements phase と tasks phase でも、`draft_status: READY_FOR_REVIEW` の場合は Previous Response または phase result report の draft content を優先する。
- 対象 draft が見つからない場合は、別 phase の既存 artifact を代用して `APPROVE` してはならない。`REJECT` とし、`missing_draft_artifact` を finding_id として報告する。
- git diff、current dirty worktree、または unrelated workflow/facet changes を対象にした report は `APPROVE` してはならない。`REJECT` とし、`ai_gate_scope_mismatch` を finding_id として報告する。
- design phase の AI gate report では、検証対象が design draft であることを明記する。requirements draft を対象にした report は downstream design review の根拠にならない。
- design phase の AI gate report には `review_target: design_draft` を明記する。unscoped git diff を読んだ場合は `review_target: git_diff` とし、`REJECT` / `ai_gate_scope_mismatch` にする。
- tasks phase の AI gate report では、検証対象が tasks draft であることを明記する。workflow/facet/script/test の未コミット差分を対象にした report は downstream task review の根拠にならない。
- tasks phase の AI gate report には `review_target: tasks_draft` を明記する。unscoped git diff を読んだ場合は `review_target: git_diff` とし、`REJECT` / `ai_gate_scope_mismatch` にする。

## Kiro implementation selected-task mode

current workflow が `kiro-ai-quality-gate` の場合は、対象を selected task implementation に固定する。

- caller の `kiro-task-implementation-result.md` と `kiro-implementation-plan.md` を読み、`selected_task`、`baseline_dirty_files`、`changed_files`、validation evidence を確認する。
- review target は `changed_files` の path-filtered diff だけにする。実コード差分を読む場合は `git diff -- <changed_files>` を使う。
- path filter なしの `git diff`、current dirty worktree 全体、または `baseline_dirty_files` に含まれる既存未コミット差分を primary review target にしてはならない。
- `changed_files` が空、implementation report が missing、または selected task / boundary が特定できない場合は `REJECT` とし、`implementation_scope_mismatch` を finding_id として報告する。
- `git status --porcelain` に `baseline_dirty_files` と `changed_files` のどちらにも含まれない dirty file がある場合は、selected task scope が不明確な fatal condition として `REJECT` し、`implementation_scope_mismatch` を報告する。reviewers へ進めるために非ブロッキングへ落としてはならない。
- implementation AI gate report には `review_target: selected_task_diff` と `changed_files` を明記する。unscoped git diff を primary target にした場合は `review_target: git_diff` とし、`REJECT` / `implementation_scope_mismatch` にする。

## 必須出力
0. Kiro spec generation draft mode または implementation selected-task mode では `review_target` を示す
1. finding ごとに根拠を示す
2. 最終判定を `APPROVE` または `REJECT` で示す
3. `REJECT` の場合は、修正方針を file/line 付きで示す
