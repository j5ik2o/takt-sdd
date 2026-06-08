# Research & Design Decisions

## Summary

- **Feature（機能）**: `kiro-ai-quality-gate-workflow-coverage`
- **Discovery Scope（ディスカバリー範囲）**: Extension
- **Key Findings（主要な発見）**:
  - 既存の generation-scoped gate は `kiro-spec-ai-quality-gate.yaml` と validator/test で実装済みだが、`kiro-discovery` はまだ `orchestration_delegated` として扱われている。
  - `kiro-discovery` は `write-discovery-artifacts` だけが edit-capable で、successful artifact write path は現在 `report-discovery` へ直行する。
  - `validate-kiro-discovery-batch-workflows.mjs` は `workflow_call` を一律禁止しているため、discovery gate を入れるには allowlist 化が必要である。

## Research Log

### Existing coverage inventory and validators

- **Context（背景）**: requirements 改訂で `kiro-discovery` が discovery artifact gate required へ変わったため、既存 classification と validator の変更点を確認した。
- **Sources Consulted（参照した情報源）**:
  - `scripts/kiro-ai-quality-gate-contracts.mjs`
  - `scripts/validate-kiro-ai-quality-gate-workflow-coverage.mjs`
  - `tests/kiro-ai-quality-gate-workflow-coverage.test.mjs`
- **Findings（発見）**:
  - category set には `discovery_artifact_gate_required` がまだない。
  - `kiro-discovery` は `orchestration_delegated`、`allowedGateCall` なしで固定されている。
  - 新規 `kiro-discovery-ai-quality-gate` も `.takt/{en,ja}/workflows/kiro-*` に該当するため、coverage inventory に callable gate 自体として分類する必要がある。
  - tests は discovery/batch の direct gate absence を期待している。
- **Implications（含意）**:
  - coverage inventory を machine-readable 正本として更新する。
  - `kiro-discovery-ai-quality-gate` は `existing_gate_coverage` に分類し、全 workflow exactly once invariant を維持する。
  - `kiro-spec-batch` の delegated classification は維持し、discovery だけを gate required に移す。
  - tests は discovery direct gate を positive expectation に変更し、batch direct gate absence を negative expectation として残す。

### Kiro discovery workflow insertion point

- **Context（背景）**: discovery gate をどこへ挿入するかを、既存 workflow 責務から判断した。
- **Sources Consulted（参照した情報源）**:
  - `.takt/{en,ja}/workflows/kiro-discovery.yaml`
  - `.takt/{en,ja}/facets/instructions/kiro-discovery.md`
  - `.takt/{en,ja}/facets/output-contracts/kiro-discovery-result.md`
- **Findings（発見）**:
  - `classify-action-path` と `plan-discovery-artifacts` は readonly である。
  - `write-discovery-artifacts` は edit-capable で、artifact write 成功後に `report-discovery` へ進む。
  - artifact-less paths は discovery gate を通す必要がない。
- **Implications（含意）**:
  - gate は `write-discovery-artifacts` の successful artifact write path と `report-discovery` の間へ挿入する。
  - `need_replan` は `plan-discovery-artifacts` に戻るため、caller workflow 側で `plan-discovery-artifacts -> write-discovery-artifacts -> ai-quality-gate-discovery` の loop monitor を定義する必要がある。
  - `report-discovery` は namespaced discovery gate reports を確認してから completion を報告する。
  - loop monitor threshold に到達した場合は、追加修正を続けず blocked discovery result として報告する。

### Workflow call boundary

- **Context（背景）**: `kiro-discovery` に reusable subworkflow を挿入すると、既存 discovery/batch validator と shared validator に影響する。
- **Sources Consulted（参照した情報源）**:
  - `scripts/validate-kiro-shared-contracts.mjs`
  - `scripts/validate-kiro-discovery-batch-workflows.mjs`
  - `.takt/{en,ja}/workflows/kiro-spec-ai-quality-gate.yaml`
- **Findings（発見）**:
  - shared validator は helper 由来の allowed call sites を既に扱う。
  - discovery/batch validator は `workflow_call` を一律禁止している。
  - generation gate は implementation gate と分離され、report names と fix instruction を分けている。
- **Implications（含意）**:
  - discovery/batch validator は一律禁止から approved discovery gate call だけを許可する allowlist check に変える。
  - phase reuse、shell `takt -w`、`kiro-spec-batch` direct gate は引き続き禁止する。
  - discovery gate は implementation/spec report names を再利用しない。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|---|---|---|---|---|
| Reuse implementation gate | `kiro-ai-quality-gate.yaml` を discovery 用 `fix_instruction` で呼ぶ | ファイル数が少ない | report names と implementation progress policy が混ざる | 不採用 |
| Reuse spec generation gate | `kiro-spec-ai-quality-gate.yaml` を discovery から呼ぶ | 既存 gate を再利用できる | spec artifact boundary と discovery artifact boundary が混ざる | 不採用 |
| Dedicated discovery gate | `kiro-discovery-ai-quality-gate.yaml` を追加する | 境界、report names、fix instruction が明確 | 追加ファイルと validator 更新が必要 | 採用 |
| Inline gate steps | `kiro-discovery.yaml` に review/fix steps を直接追加する | `workflow_call` validator 変更が不要 | reusable subworkflow 化できず、PR #90 shared contract を使いにくい | 不採用 |

## Design Decisions

### Decision: Discovery gate は専用 callable subworkflow にする

- **Context（背景）**: `kiro-discovery` の成果物は `brief.md` と roadmap であり、implementation task や spec generation draft と違う境界を持つ。
- **Alternatives Considered（検討した代替案）**:
  1. implementation gate を parameterized に再利用する。
  2. spec generation gate を discovery から呼ぶ。
  3. dedicated discovery gate を作る。
- **Selected Approach（採用したアプローチ）**: `kiro-discovery-ai-quality-gate.yaml` を en/ja に追加し、`kiro-ai-antipattern-fix-discovery` と discovery-specific report names を使う。
- **Rationale（根拠）**: discovery artifact 境界を実装・spec generation 境界から分離でき、validator が誤配線を検出しやすい。
- **Trade-offs（トレードオフ）**: ファイルは増えるが、TAKT の reusable subworkflow 機能を使いながら semantic overloading を避けられる。
- **Follow-up（フォローアップ）**: runtime smoke で clean path を確認する。

### Decision: Discovery replan は caller loop monitor で収束管理する

- **Context（背景）**: discovery gate の `need_replan` は `plan-discovery-artifacts` に戻るため、caller 側に `plan -> write -> gate` の循環ができる。
- **Alternatives Considered（検討した代替案）**:
  1. `need_replan` を常に `ABORT` にする。
  2. `max_steps` だけに任せる。
  3. caller loop monitor で収束管理する。
- **Selected Approach（採用したアプローチ）**: `kiro-discovery` に `plan-discovery-artifacts`、`write-discovery-artifacts`、`ai-quality-gate-discovery` を含む loop monitor を追加し、threshold 到達時は blocked discovery result へ進める。
- **Rationale（根拠）**: PR #90 の caller loop monitor 契約を discovery にも適用でき、replan 可能な issue と非収束 issue を分離できる。
- **Trade-offs（トレードオフ）**: discovery workflow は loop monitor を持つが、read-only workflow ではなく artifact-writing workflow なので責務境界には反しない。
- **Follow-up（フォローアップ）**: validator と smoke test で cycle membership と threshold path を検証する。

### Decision: `kiro-discovery` は gate required、`kiro-spec-batch` は delegated のままにする

- **Context（背景）**: discovery は自分で planning artifacts を書くが、batch は worker generation workflows を orchestrate する。
- **Alternatives Considered（検討した代替案）**:
  1. discovery と batch の両方に direct gate を入れる。
  2. discovery だけを gate required にする。
  3. 両方とも downstream delegation のままにする。
- **Selected Approach（採用したアプローチ）**: discovery は `discovery_artifact_gate_required`、batch は `orchestration_delegated` にする。
- **Rationale（根拠）**: requirements の discovery artifact gate 要求を満たしつつ、batch の worker ownership を崩さない。
- **Trade-offs（トレードオフ）**: batch aggregation 自体の AI review は今後の別判断として残る。
- **Follow-up（フォローアップ）**: coverage validator で batch direct gate absence を維持する。

### Decision: Discovery validator は allowlist 化する

- **Context（背景）**: 既存 discovery/batch validator は `workflow_call` を phase reuse 防止目的で一律禁止している。
- **Alternatives Considered（検討した代替案）**:
  1. `workflow_call` 禁止を削除する。
  2. discovery gate だけを helper allowlist で許可する。
  3. inline steps にして validator を変えない。
- **Selected Approach（採用したアプローチ）**: helper の allowed call sites に `kiro-discovery` gate call を追加し、validator はその call だけを許可する。
- **Rationale（根拠）**: reusable subworkflow を使いつつ、phase reuse と mechanical gate insertion を引き続き検出できる。
- **Trade-offs（トレードオフ）**: validator が helper に依存するが、contract drift は一箇所で管理できる。
- **Follow-up（フォローアップ）**: negative tests で unapproved call path と batch direct gate を検出する。

## Design Synthesis Update

- Generalization: implementation/spec/discovery gates は separate workflows だが、allowed call site、routing vocabulary、optional fix report、loop outcome terms は shared helper で一般化する。
- Build vs Adopt: 外部依存は追加せず、TAKT `workflow_call`、built-in `ai-antipattern-reviewer`、Node.js `node:test` を採用する。
- Simplification: discovery gate は artifact write success path だけに置き、artifact-less discovery paths には追加しない。
- Boundary correction: 新規 callable gate も Kiro workflow inventory の対象であるため、`kiro-discovery-ai-quality-gate` を `existing_gate_coverage` として classified workflow に含める。

## Risks & Mitigations

- `kiro-discovery` が implementation fix instruction を誤って使う — coverage validator で forbidden instruction/report names を検出する。
- discovery/batch validator の `workflow_call` 禁止を弱めすぎる — helper allowlist の exact match だけを許可する。
- discovery gate が spec artifact へ越境修正する — fix instruction と output contract に boundary guard を入れ、report validation で検出する。
- discovery replan が非収束ループになる — caller loop monitor で `plan-discovery-artifacts`、`write-discovery-artifacts`、`ai-quality-gate-discovery` の cycle を監視する。
- runtime smoke が通常 provider を起動する — mock provider path を opt-in にし、CI では deterministic fixture だけを使う。

## References

- `.kiro/specs/kiro-ai-quality-gate-workflow-coverage/requirements.md`
- `.takt/{en,ja}/workflows/kiro-discovery.yaml`
- `.takt/{en,ja}/workflows/kiro-spec-ai-quality-gate.yaml`
- `scripts/kiro-ai-quality-gate-contracts.mjs`
- `scripts/validate-kiro-discovery-batch-workflows.mjs`
