# 実装ギャップ分析 (research.md)

> Source: `/kiro-validate-gap kiro-impl-verification-hardening`
> 対象: 既存実装済み `kiro-iterative-implementation-workflow`（kiro-impl.yaml / facets / validator / tests）への提案1-4 の差分。

## 1. 分析サマリ

- 既存ワークフローは完成度が高く、本 feature は**新規コンポーネントではなく既存資産の拡張（Option A）**が全領域で妥当。
- **最小リスク経路**: ステップ topology（8 step の順序）を変えず、step 属性（`quality_gates` / `allow_git_commit`）と facet 内容で提案1/3/4 を実現する。これにより validator の `expectedSteps` 固定配列・loop_monitors ハードコード文字列の改変が不要になる。
- **検証層は同一ファイルを所有**: 契約は `validate-kiro-iterative-implementation-workflow.mjs` と `tests/kiro-iterative-implementation-workflow.test.mjs` が握る。新規 validator を作らず**この2ファイルを拡張**する（同一 artifact の契約二重所有を避ける）。
- **最大の研究項目**: 提案1 のコマンドゲートは `command` が静的文字列だが、kiro-impl は repo 非依存の汎用ワークフローで検証コマンドは runtime 検出。この橋渡しが唯一の High リスク。
- 提案2 は reviewer 構造を変えず facet 内容のアドバーサリアル化に限定でき、Req 9 集約契約（`all("approved")`）と Req 9.8（security gate 常時禁止）を維持できる。

## 2. 現状調査（既存資産）

| 資産 | パス | 役割 |
|---|---|---|
| 実装ワークフロー | `.takt/{ja,en}/workflows/kiro-impl.yaml` | 8 step: plan-one-task → execute-task → ai-quality-gate(workflow_call) → reviewers(parallel×4) → debug-task → verify-task-completion → update-progress → validate-impl-final |
| AI gate サブWF | `.takt/{ja,en}/workflows/kiro-ai-quality-gate.yaml` | ai-antipattern-review-1st ↔ ai-antipattern-fix(coder/edit) ↔ request-replan |
| facets | `.takt/{ja,en}/facets/{instructions,policies,output-contracts}/` | execute/plan/update-progress/review×4/debug/verify/validate-final ほか |
| validator | `scripts/validate-kiro-iterative-implementation-workflow.mjs` | step順・reviewer構成・loop_monitors・facet term・ja/en parity・package scripts を固定 |
| tests | `tests/kiro-iterative-implementation-workflow.test.mjs` + `kiro-ai-quality-gate-runtime-smoke.test.mjs` | validator の reject ケース網羅 + runtime smoke |
| skill source of truth | `.claude/skills/kiro-impl/SKILL.md` + `.agents/skills/kiro-impl/SKILL.md`(+templates) | 挙動の正本（Req 8） |
| takt 0.45.0 | `node_modules/takt/` | `quality_gates(type:command)` / `allow_git_commit` / `loop_monitors` / per-step `model` を提供 |

**validator が固定している主要契約（変更時に必ず追従が要る）**:
- `expectedSteps` 配列（step 順序の厳格一致）。**新規 step 追加＝この配列の更新が必須**。
- reviewer group: 4 reviewer の名前・順序・persona・report・readonly・`approved`/`needs_fix`・`all("approved")→verify`・`any("needs_fix")→debug`。
- loop_monitors: `execute-task→ai-quality-gate→reviewers→debug-task, threshold: 2` を**文字列完全一致**で要求。
- `customLoopSourcePattern`: 独自 retry/maxAttempts 等を禁止。
- ja/en parity（step 名一致・machine term 両言語存在）、package.json script の完全一致。
- `quality_gates` / `allow_git_commit` / コミット粒度 / Implementation Notes 読込（execute側）は**現状ノーチェック＝新規アサーション追加余地**。

## 3. 要件 → 資産マップ（ギャップタグ: Missing / Unknown / Constraint）

| 要件 | 既存資産 | ギャップ |
|---|---|---|
| 要件1 コマンドゲート | execute-task/ai-antipattern-fix は agent step（付与可） | **Missing**: `quality_gates` 未使用・validator 未チェック。**Unknown**: 静的 command ↔ repo 依存コマンドの橋渡し。**Constraint**: gate は agent step のみ（workflow_call の ai-quality-gate step 本体には不可、内部 fix step には可）/ `workflow_command_gates.custom_scripts: true` は既に有効 |
| 要件2 loop一本化 | loop_monitors 既存・`customLoopSourcePattern` 既存 | **Constraint**: 既存 loop_monitors 文字列を壊さない。gate 失敗(同一step差し戻し)と debug ルートの責務分離を facet/SKILL で明文化 |
| 要件3 アドバーサリアル review | reviewer×4 構造・review facet 既存 | **Partial**: 構造は再利用、facet 内容を「既定 reject・証拠引用で承認」へ。validator の review facet term 配列に adversarial 用語を追加。`all("approved")`/security 非常時は維持（Constraint） |
| 要件4 タスク単位コミット | update-progress(coder/edit, agent step) | **Missing**: コミット step/属性なし。**Constraint**: takt 既定 auto-commit は `git add -A` で per-workflow-run 1コミット（粗い）。**Unknown**: 既定 auto-commit を抑止するか共存か |
| 要件5 知識伝播 | update-progress facet と policy は Implementation Notes 読込済み | **Partial**: execute-task / debug-task facet は Implementation Notes 読込を未明記。両 facet + validator term に追加 |
| 要件6 整合 | validator/tests/ja-en/SKILL 既存 | **Constraint**: 新規 validator を作らず既存を拡張。ja/en 両更新・test 名カバレッジ配列追加・SKILL 2箇所更新が必須 |

## 4. 実装アプローチ（Option A/B/C）

### Option A: 既存資産を拡張（推奨）
- workflow: kiro-impl.yaml の execute-task に `quality_gates`、update-progress に `allow_git_commit`、ai-quality-gate.yaml の fix step に `quality_gates` を**属性追加**。**step 追加なし**。
- facets: review×4 をアドバーサリアル化、execute/debug に Implementation Notes 読込追記。
- validator/tests: `validate-kiro-iterative-implementation-workflow.mjs` に新アサーション追加、test 名カバレッジ配列・fixture 追加。
- SKILL.md: `.claude` / `.agents` 両方を更新（正本）。
- **✅ trade-off**: `expectedSteps`/loop_monitors 文字列を温存しドリフト最小 / 契約の単一所有を維持。❌ 既存ファイルが少し肥大。

### Option B: 新規コンポーネント（commit 専用 step 等）
- update-progress と plan-one-task の間に `commit-task` step を新設。
- **✅**: コミット責務が独立。❌ `expectedSteps` 配列改変・routing 全体の再検証・loop_monitors 影響評価が必要で**ドリフトリスク大**。新規 validator/test 量も増える。
- 採用条件: コミットを progress 更新と分離する強い理由が design で出た場合のみ。

### Option C: ハイブリッド（コマンド解決のみ別コンポーネント）
- 提案1 のコマンド解決を、takt-sdd 同梱の小さなディスパッチャスクリプト（planner が検出した検証コマンドを既知の場所から解決）として新設し、`quality_gates.command` がそれを呼ぶ。他は Option A。
- **✅**: 汎用ワークフローでも決定論ゲートが成立。❌ 新規スクリプト + 配布/検証対象が増える。
- 提案1 の Unknown（静的 command 問題）の解が「テンプレート変数不可」だった場合の有力策。

## 5. 工数・リスク

| 領域 | 工数 | リスク | 根拠 |
|---|---|---|---|
| 提案1 コマンドゲート | M | **High** | コマンド解決方式が未確定（汎用WF ↔ repo依存）。解次第で S〜L |
| 提案2 アドバーサリアル review | S–M | Low | facet 内容 + validator term 追加。構造不変 |
| 提案3 タスク単位コミット | M | Medium | auto-commit 調停 + 選択的staging。Option A なら step 不変 |
| 提案4 知識伝播 | S | Low | facet 2本 + validator term |
| 要件6 検証/ja-en/SKILL 追従 | M | Medium | 全変更を validator/test/ja-en/SKILL に二重展開。機械チェックが厳格 |
| 全体 | **M（コマンド解決が L化すれば L）** | Medium | — |

## 6. design フェーズへの申し送り

**推奨アプローチ**: Option A を基本とし、提案1 のコマンド解決のみ Option C を条件付き併用。**ステップ topology 不変**を設計原則とし、step 属性 + facet 内容で吸収する。

**design で必ず解く研究項目（brief.md の3問を具体化）**:
1. **(最優先) コマンドゲートのコマンド解決**: `quality_gates.command` がテンプレート変数（planner 出力の TEST/BUILD コマンド）を受けられるか node_modules/takt で確認。不可なら Option C（同梱ディスパッチャ）か、規約コマンド方式か、coder-run validation 併存（Req 4.2 維持 + gate は安定コマンドのみ）を比較し決定。配布先 repo での挙動も評価。
2. **auto-commit 調停**: takt 既定 auto-commit を抑止する設定があるか確認。なければ「per-task `allow_git_commit` + 末尾の粗い auto-commit 容認」か「既定抑止 + per-task のみ」を選択。コミット履歴がタスク境界に一致する受入基準（要件4.4）を満たす方式を決める。
3. **gate 失敗 ↔ debug-task 責務分離**: コマンドゲート失敗は同一 step 差し戻し（takt ネイティブ）、review/verify 失敗は debug-task。二重リトライ・ループ非生産判定の不整合が起きない分岐を loop_monitors 文字列を壊さず設計（要件2）。
4. **validator 拡張の具体アサーション設計**: quality_gates 配置 / allow_git_commit / adversarial review 用語 / execute-task の Implementation Notes 用語 を、既存 `containsAll`/`hasRuleWithTerms`/`stepScalar` 機構でどう表現するか。test 名カバレッジ配列（`validateTaskFixtureCoverage`）への追加 reject ケースも列挙。

**設計原則（Constraints 再掲）**:
- ステップ topology 不変を最優先（やむを得ず step 追加時は `expectedSteps` と loop_monitors 文字列を同時更新）。
- 挙動は SKILL.md（正本, 2箇所）→ facet adapter delta の順で反映。本文コピー禁止（Req 8）。
- 再実行制御は loop_monitors のみ（独自カウンタ禁止, Req 2/既存 `customLoopSourcePattern`）。
- ja/en 両資産・validate・node:test を必ず対で更新（Req 6）。
- security 常時 reviewer 追加禁止・`all("approved")` 維持（Req 3/9.8）。

---

# 設計フェーズ調査ログ（takt 0.45.0 ソース確認）

> Source: `/kiro-spec-design` discovery（node_modules/takt 0.45.0 ソース精読）。design.md の根拠。

## 調査ログ

### quality_gates のコマンド解決
- **背景**: 汎用ワークフローが repo 固有の検証コマンドをゲートで実行できるか。
- **参照**: `node_modules/takt/dist/core/workflow/quality-gates/commandGateRunner.js`。
- **発見**: `spawn(gate.command, {shell:true, cwd, env: allowlist})` に**逐語渡し**。テンプレート変数（`{{}}`/`{}`/`${}`）置換は**無い**。env は PATH/SHELL/TMPDIR 等の allowlist のみで、prior-step 出力・changed_files・task 名は注入されない。shell:true なので `$(...)`・`&&`・env 展開は OS シェルで効く。
- **含意**: planner が検出したコマンドを gate に直接渡せない。固定文字列で repo 所有のフック（`.kiro/settings/verify.sh`）を呼ぶ方式が唯一の非侵襲解。gate は agent step のみ（workflow_call/system 不可）。

### --skip-git と auto-commit
- **背景**: 提案3 が takt 既定 auto-commit と衝突しないか。
- **参照**: `dist/app/cli/program.js`(L41)、`dist/features/pipeline/execute.js`(L31-44)、`dist/infra/task/autoCommit.js`、`taskExecution.js`(L86)。
- **発見**: `--skip-git` は takt ネイティブ flag。pipeline モードで branch/commit/push を**完全スキップ**（`kiro:*` 全 npm script が付与）。auto-commit は `isWorktree:true` 時のみ・workflow 完了後に `git add -A` で1コミット（`takt: {taskName}`）。auto-commit 無効化の config キーは**無い**。
- **含意**: canonical な pipeline 実行では takt は一切コミットしない → per-task `allow_git_commit` コミットが唯一かつタスク粒度になる。worktree モードのみ末尾の粗いコミットが残る（無効化不可）。

### allow_git_commit の意味
- **参照**: `dist/core/workflow/instruction/instruction-context.js`(L27-48)。
- **発見**: `allow_git_commit:true` は「commit/push/add するな」指示テキストの**抑止のみ**。engine は自動 stage しない。選択的コミットは agent が Bash で `git add/commit` を実行する必要がある。`--skip-git` とは別レイヤで干渉しない。
- **含意**: update-progress（Bash 保有）に `allow_git_commit:true` + facet で選択的コミット手順を書けば実現。

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク／制約 | 採否 |
|--------|------|------|------|------|
| 属性付加（非侵襲拡張） | step 属性 + facet 内容で実現、step 追加なし | validator の expectedSteps/loop_monitors 文字列を温存、drift 最小 | gate/commit が既存 step に密結合 | **採用** |
| 新規 commit step | commit 専用 step を追加 | 責務分離 | expectedSteps 改変・routing 再検証・drift 大 | 不採用 |
| 同梱 node ディスパッチャ | gate が同梱 .mjs を実行し設定を解釈 | 堅牢な設定解釈 | 配布（インストーラ）依存・新規コンポーネント | 不採用（インラインフック規約で代替） |
| インラインシェル + repo フック | gate one-liner が `.kiro/settings/verify.sh` を実行 | 同梱物ゼロ・配布リスク回避・非破壊 | repo がフック未提供だと no-op | **採用** |

## 設計判断

### 判断: コマンドゲートは repo 所有フックを呼ぶ additive backstop
- **背景**: takt gate はテンプレート非対応の固定文字列。汎用WF で repo 固有検証が必要。
- **検討**: 同梱ディスパッチャ / npm `--if-present` / インライン+フック。
- **採用**: インライン `sh -c` で `.kiro/settings/verify.sh` を実行（不在は no-op 通知）。Req 4.2 の coder-run 検証を置換せず**補強**。未解決時の完了阻止（要件1.5）は既存 verify-completion 証跡ゲートが担保。
- **トレードオフ**: 配布先での既定有効化はインストーラ依存（R1）。per-task 絞り込みなし（R2）。agent によるフック改変余地（R4）。
- **フォローアップ**: gate 再試行上限の確認（R5）。

### 判断: per-task commit は update-progress の allow_git_commit
- **採用**: 新規 step を作らず update-progress に `allow_git_commit:true` + 選択的コミット facet。pipeline では唯一のコミット、worktree 末尾の `git add -A` は残差のみ（許容）。

## Synthesis（3レンズ）
- **一般化**: 検証コマンド解決を「repo 所有フック」という interface に一般化（実装は repo 委譲）。コミット/ゲートは別関心として分離維持。
- **Build vs Adopt**: quality_gates・allow_git_commit・loop_monitors は takt ネイティブを採用。独自 retry/commit ロジックは作らない。同梱ディスパッチャは作らず規約で代替。
- **単純化**: ステップ topology 不変、reviewer 構造再利用、per-task 検証絞り込みは非目標として除外。最小差分を維持。

## リスクと緩和策（design.md R1-R5 と対応）
- R1 配布: 当面「任意フック・不在 no-op」で非破壊。配布既定化は takt-sdd-global-cli へ申し送り。
- R3 worktree 末尾コミット: per-task で clean tree を保ち実害最小、SKILL 明記。
- R5 ゲート無限差し戻し: 再試行上限を確認し、無ければ loop_monitors カバレッジで停止を smoke 確認。
