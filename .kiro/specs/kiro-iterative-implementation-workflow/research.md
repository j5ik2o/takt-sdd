# Gap Analysis: kiro-iterative-implementation-workflow

_作成日: 2026-06-09_

## Analysis Summary

- requirements は未承認だが、brownfield gap analysis として続行した。今回の差分は `kiro-impl` の単一 `review-task` を、AI antipattern gate 後の `parallel:` reviewer group に拡張し、coding / architecture / QA / testing を並行に確認する点が中心。
- 既存 `.takt/{en,ja}/workflows/kiro-impl.yaml` は AI quality gate、単一 coding review、debug、completion verification、progress update、final validation まで実装済み。one-task、readiness、progress update、loop monitor の基盤は再利用できる。
- TAKT built-in には `architecture-reviewer`、`qa-reviewer`、`testing-reviewer` persona と `review-arch`、`review-qa`、`review-test` instruction、対応 output contract が存在する。新規 reviewer のプロンプト本文を作るより、Kiro adapter として差分接続する方が既存資産を活用できる。
- 現在の `design.md` と `tasks.md` は旧 requirements に基づく完了済み計画であり、`parallel:` reviewer group、review report 名、validator 期待 step、loop monitor cycle を反映していない。design / tasks は再生成が必要。
- 検証スクリプト `scripts/validate-kiro-iterative-implementation-workflow.mjs` は現在の step order を固定配列で検証しているため、workflow 変更と同時に validator/test の期待値更新が必要。

## Current State Investigation

### Existing Assets

| Area | Existing Asset | Status |
| --- | --- | --- |
| Main workflow | `.takt/{en,ja}/workflows/kiro-impl.yaml` | 既存。`plan-one-task -> execute-task -> ai-quality-gate -> review-task -> debug/verify/update/final` の単一 review gate 構成。 |
| AI gate | `.takt/{en,ja}/workflows/kiro-ai-quality-gate.yaml` | 既存。`ai-antipattern-reviewer` と fix loop を reusable subworkflow として利用済み。 |
| Coding review adapter | `.takt/{en,ja}/facets/instructions/kiro-review-task.md` | 既存。`kiro-review` skill output に接続し、AI gate evidence を読む。 |
| Review verdict contract | `.takt/{en,ja}/facets/output-contracts/kiro-review-verdict.md` | 既存。`VERDICT: APPROVED | REJECTED` と evidence fields を定義。 |
| Debug / verify / progress | `kiro-debug-task.md`、`kiro-verify-task-completion.md`、`kiro-impl-update-progress.md` | 既存。completion before checkbox update の基盤は流用可能。 |
| Validator | `scripts/validate-kiro-iterative-implementation-workflow.mjs` | 既存。現在は `expectedSteps` と単一 `review-task` routing を固定検証。 |
| Tests | `tests/kiro-iterative-implementation-workflow.test.mjs` | 既存。AI gate order、loop monitor、resource reference、progress update drift を fixture で検出。 |

### Built-in TAKT Reviewer Assets

TAKT built-ins には以下の reviewer 資産が存在する。

- personas: `architecture-reviewer`、`qa-reviewer`、`testing-reviewer`、`coding-reviewer`、`security-reviewer`
- instructions: `review-arch`、`review-qa`、`review-test`、`review-coding`
- output contracts: `architecture-review`、`qa-review`、`testing-review`、`coding-review`
- workflows: `review-default.yaml` / `peer-review.yaml` が `architecture`、`security`、`QA`、`testing`、`requirements` を並列 review する例を持つ。

今回の requirements は security-specific reviewer を常時必須 gate に含めないため、`security-reviewer` は reusable asset として存在するが in-scope gate からは除外する。

### Dominant Patterns

- Kiro-specific workflow は `.takt/{en,ja}/workflows/` に同名で配置し、facet basename と machine enum を en/ja で揃える。
- instruction facet は上流 Kiro skill への `extends_skill` / `extends_skill_section` と TAKT built-in への `{extends: ...}` を使い、差分だけを書く。
- workflow rule は prose ではなく primary machine field を見る。現在の implementation flow では `STATUS`、`VERDICT`、`NEXT_ACTION`、`DECISION` が使われている。
- loop retry の source of truth は `loop_monitors.threshold`。facet や validator に独自 retry counter を持たせない。
- repository-local validation はドキュメントではなく script/test で drift を検出する。

## Requirement-to-Asset Map

| Requirement | Existing Asset | Gap |
| --- | --- | --- |
| 1 readiness gate | `plan-one-task`、`kiro-impl-plan-one-task.md`、validator | 既存基盤あり。今回の reviewer 追加による readiness 追加は不要。 |
| 2 one task selection | `plan-one-task`、task annotation policy | 既存基盤あり。review gate 追加の影響は低い。 |
| 3 boundary / validation plan | planner / executor facets | 既存基盤あり。architecture / QA / testing review が参照する evidence への接続を強める必要あり。 |
| 4 execution / evidence | `execute-task`、`kiro-implementation-result` | 既存基盤あり。複数 review reports を evidence consumer として後段へ渡す必要あり。 |
| 5 AI antipattern gate | `ai-quality-gate` workflow_call | 既存。`COMPLETE` 後の next が `review-task` 固定で、`parallel:` reviewer group へ変更が必要。 |
| 6 completion verification | `verify-task-completion` | 既存。確認対象 reports が単一 review から複数 review reports に増える gap あり。 |
| 7 workflow drift detection | validator / tests | 既存。`expectedSteps`、routing、loop monitor、report references が旧単一 review 前提。更新必須。 |
| 8 Kiro skill adapter | existing facets with `extends_skill` | 既存。新規 architecture / QA / testing gate は上流 Kiro skill ではなく TAKT built-in reviewer adapter として扱うのが自然。 |
| 9 multi-review gate | built-in reviewer personas/instructions/contracts | Missing。`parallel:` reviewer group、adapter facets、report names、validator/test coverage が未実装。 |

## Explicit Gaps

### Missing

- `kiro-impl.yaml` に coding / architecture / QA / testing を束ねる `parallel:` reviewer group がない。
- AI quality gate `COMPLETE` 後の routing が `review-task` 固定で、`reviewers.parallel` を実行して all approved / any needs_fix で分岐する形を表現していない。
- `loop_monitors` の review/debug cycle が `review-task` 固定で、`reviewers` group と debug の再実行経路を表現していない。
- `kiro-verify-task-completion.md` が複数 review report を必須 evidence として扱う契約になっていない。
- `kiro-debug-task.md` が review viewpoint / report name / finding source を debug decision に渡す前提を明示していない。
- `kiro-review-verdict` は汎用 verdict として再利用可能だが、report の `review_scope` / `evidence` に review kind を必ず持つことを validation する仕組みがまだない。
- validator / tests が `parallel:` reviewer group、子 reviewer の persona、instruction、report format、group-level all/any routing、security reviewer 非必須を検出していない。

### Constraints

- `.agents/skills/kiro-*` は上流スキル資産で直接修正しない。TAKT workflow/facet 側の高優先度プロンプトで意味を補強する。
- `.takt/en` と `.takt/ja` は言語ペアの構造を保つ必要がある。
- `kiro-review` / `kiro-debug` / `kiro-verify-completion` は standalone workflow ではなく `kiro-impl.yaml` 内 adapter step として接続するという既存 requirements を維持する。
- `workflow_call` は現在 AI quality gate の reusable subworkflow に限定されている。built-in review workflow をそのまま呼ぶと、既存 validator と shared workflow_call boundary に抵触しやすい。
- `review-default.yaml` は並列 review の良い参考になるが、security/requirements review を含むため、今回の「security 常時必須にしない」境界にはそのまま合わない。

### Unknown / Research Needed

- TAKT の `parallel` step の子 step verdict を `debug-task` にどの粒度で渡すべきか。group-level all/any routing は可能だが、debug input として rejected child reports をどう列挙するかは design phase で詰める。
- built-in output contracts `architecture-review`、`qa-review`、`testing-review` の machine field が `approved/needs_fix` 中心の場合、既存 `VERDICT APPROVED/REJECTED` に寄せる wrapper contract が必要か。
- runtime smoke test で複数 reviewer step の deterministic wiring をどこまで mock するか。現行の smoke 方針に合わせるなら、provider 実行品質ではなく step/report wiring だけを見る opt-in script が適切。

## Implementation Approach Options

### Option A: Extend Existing `review-task` Into a Multi-Role Generic Step

既存 `review-task` facet を拡張し、coding / architecture / QA / testing を 1 step 内でまとめて判定する。

**Pros**

- workflow step 数が増えず、既存 validator 変更量が少ない。
- report contract は `kiro-review-verdict` をそのまま使える。

**Cons**

- Requirement 9 の「coding 後に architecture、architecture 後に QA、QA 後に testing」という gate order が workflow 上で見えない。
- reviewer persona を使い分けられず、TAKT built-in reviewer 資産の活用が弱い。
- どの観点が reject したかが workflow rule から見えにくい。

**Assessment**

短期差分は小さいが、今回の目的である多観点 gate の決定論的 wiring には弱い。

### Option B: Add Sequential Reviewer Adapter Steps

`review-task` を coding review として残し、その後に `architecture-review-task`、`qa-review-task`、`testing-review-task` を追加する。各 step は built-in persona / instruction / output contract を継承または参照し、`VERDICT` で debug / next gate へ分岐する。

**Pros**

- Requirement 9 の順序が workflow YAML と validator で明確に検出できる。
- `architecture-reviewer`、`qa-reviewer`、`testing-reviewer` を直接使える。
- rejected gate の viewpoint と report file が debug decision に渡しやすい。
- security reviewer を非必須にする境界も validator で検出しやすい。

**Cons**

- workflow step、report format、validator/test の更新範囲が増える。
- built-in review output contract と `kiro-review-verdict` の field 語彙を揃える wrapper 方針が必要。

**Assessment**

直列 gate を要求する場合には有効だが、TAKT built-in の既存 multi-review pattern 活用という今回の方向性には合わない。

### Option C: Add a Kiro-Specific Parallel Reviewer Group

AI quality gate 後に `reviewers` step を置き、その中で coding、architecture、QA、testing reviewer を `parallel:` 子 step として実行する。built-in `review-default` / `peer-review` の shape を参考にしつつ、Kiro-specific selected task、AI gate evidence、completion verification、debug routing に合わせた adapter facets と report names を定義する。

**Pros**

- TAKT built-in の `parallel:` multi-review pattern、reviewer personas、review instructions、output contracts を自然に活用できる。
- 各 reviewer が独立した観点を同じ完了候補に対して確認でき、実行時間も直列 gate より短い。
- group-level `all(...)` / `any(...)` rule で completion / debug routing を決定論的に表現できる。
- rejected child report を debug input に渡せば、対象観点と finding source を失わない。
- security reviewer を mandatory group から除外することを validator で明示できる。

**Cons**

- built-in `review-default` をそのまま呼ぶのではなく、Kiro-specific workflow 内に child steps を定義する必要がある。
- 子 reviewer ごとの output contract 語彙を group-level all/any rule に揃える必要がある。
- validator は top-level step order だけでなく `parallel:` child step structure を検証する必要がある。

**Assessment**

推奨。既存の one-task / AI gate / debug / completion 基盤を保持しつつ、TAKT built-in の multi-review pattern を Kiro implementation context に合わせて使える。

### Option D: Use Built-in `review-default` / `peer-review` as a Reusable Subworkflow

AI quality gate 後に built-in multi-review workflow を `workflow_call` で呼び出す。

**Pros**

- TAKT built-in workflow の再利用度が最も高い。
- architecture / QA / testing review の既存構造をまとめて使える。

**Cons**

- built-in workflow は security と requirements review を含み、今回の scope とずれる。
- `kiro-impl` の selected task、AI gate evidence、completion verification、debug routing に合わせる adapter が厚くなる。
- 現在の shared workflow_call boundary は Kiro workflow reuse を制限しており、例外設計が必要。

**Assessment**

将来の general review workflow 統合の研究対象としては有用だが、今回の `kiro-impl` には過剰。

## Recommended Design Direction

Option C を design phase の第一候補にする。

設計で決めるべき主な点:

1. Step names: top-level `reviewers` step にし、child steps を `coding-review`、`arch-review`、`qa-review`、`testing-review` にするか。
2. Report names: `kiro-task-coding-review.md`、`kiro-task-architecture-review.md`、`kiro-task-qa-review.md`、`kiro-task-testing-review.md` のように区別するか。
3. Output contract: group-level rule に合わせ、各 child reviewer が `approved` / `needs_fix` または `VERDICT APPROVED` / `VERDICT REJECTED` のどちらを返すか。
4. Debug input: `any(...)` で debug に進むとき、needs-fix child reports の `review_kind`、report file、finding ids、requirement/design/task refs を `kiro-debug-task` が必ず読むようにする。
5. Completion verification: AI gate report と 4 つの review reports を all-required evidence とし、missing / stale / cross-run evidence を `STATUS NOT_VERIFIED` または `MANUAL_VERIFY_REQUIRED` に落とす。
6. Loop monitor: `execute-task -> ai-quality-gate -> reviewers -> debug-task` の cycle を定義し、child reviewer 個別の retry counter を持たない。
7. Validator: en/ja step parity、`parallel:` child structure、persona existence、security reviewer 非必須、AI gate before reviewers、reviewers before completion、completion-before-checkbox-update を検出する。

## Effort and Risk

- **Effort: M (3-7 days)**。既存基盤はあるが、workflow step、facet、output contract、validator、fixtures、runtime smoke の複数面にまたがる。
- **Risk: Medium**。TAKT built-in reviewer asset と `parallel:` pattern は存在するため技術未知は少ない。一方で、child reviewer field contract と loop monitor cycle を誤ると deterministic routing が崩れる。

## Design Phase Carry-Forward

- 既存 design / tasks は旧単一 review gate 前提なので、requirements 承認後に再生成する。
- implementation は `kiro-impl.yaml` の拡張を中心にし、AI quality gate subworkflow と progress update gate は維持する。
- built-in `review-default` / `peer-review` の `parallel:` reviewer group は参考実装として参照するが、そのまま `workflow_call` しない。
- `security-reviewer` は built-in に存在するが、今回の mandatory gate には入れない。
- 最低限の実装確認として、validator/test に加えて deterministic wiring smoke を検討する。provider 品質を検証対象にせず、mock TAKT 実行で step/report path と routing を確認する。

---

## Design Generation Update

_作成日: 2026-06-09_

### Discovery Scope

Extension。既存 `kiro-impl` workflow、AI quality gate subworkflow、TAKT built-in `review-default` / `peer-review` の `parallel:` reviewer pattern を対象に、integration-focused discovery を実行した。外部依存や新規ライブラリはないため Web research は不要。

### Design Synthesis

- **Generalization**: coding / architecture / QA / testing は同じ「selected task completion candidate を review report と machine verdict に変換する」問題の観点差分である。設計では個別の top-level step ではなく `reviewers.parallel` child step として一般化し、report name と persona / instruction のみを差分にした。
- **Build vs Adopt**: built-in `review-default` workflow をそのまま `workflow_call` する案は security / requirements review が混ざるため採用しない。代わりに built-in reviewer persona / instruction / output contract と `parallel:` shape を採用し、Kiro-specific selected task / AI gate evidence / debug routing は `kiro-impl.yaml` 内で定義する。
- **Simplification**: direct sequential review gate は削除し、group-level `all("approved")` / `any("needs_fix")` rule に一本化する。child reviewer ごとの retry counter は持たず、loop health は `loop_monitors.threshold` に委譲する。

### Design Decisions

#### Decision: Kiro-specific parallel reviewer group

- **Context**: Requirement 9 は AI gate 後に coding / architecture / QA / testing の複数観点 review を要求する。TAKT には `parallel:` reviewer group の built-in pattern が存在する。
- **Alternatives Considered**:
  1. Single generic `review-task` — workflow 上で観点別 evidence が見えない。
  2. Sequential reviewer steps — deterministic だが TAKT built-in multi-review pattern を活かしにくい。
  3. Built-in `review-default` workflow_call — security / requirements review が mandatory になり scope とずれる。
- **Selected Approach**: `kiro-impl.yaml` 内に `reviewers.parallel` group を定義し、coding / architecture / QA / testing child reviewer を mandatory とする。
- **Rationale**: 既存 `kiro-impl` の one-task / AI gate / debug / completion boundary を保ちつつ、TAKT built-in reviewer assets を最小差分で活用できる。
- **Trade-offs**: validator は top-level step order だけでなく parallel child structure を検証する必要がある。
- **Follow-up**: child reviewer の condition vocabulary と stable report filename を implementation tasks で確定する。

### Risks & Mitigations

- Child reviewer vocabulary drift — validator で `approved` / `needs_fix` または明示 mapping を検出する。
- Security reviewer accidental inclusion — validator で mandatory `security-reviewer` child step を failure にする。
- Completion verification evidence gap — `kiro-verify-task-completion.md` と validator で AI gate report と 4 reviewer reports を required evidence にする。
