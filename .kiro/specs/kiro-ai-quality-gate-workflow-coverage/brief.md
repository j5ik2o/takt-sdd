# Brief: kiro-ai-quality-gate-workflow-coverage

## Problem
TAKT の Kiro workflow 開発者は、PR #90 で得た信頼性上の学びを `kiro-impl` 初期導入だけで終わらせず、他の Kiro workflow にも必要な範囲で適用したい。明示的な横展開境界がないと、他の Kiro write/edit または spec generation workflow では、domain-specific review gate の前に AI 特有のハルシネーション、スコープ逸脱、証跡不足、曖昧な review outcome、runtime wiring regressions を取りこぼす可能性が残る。

## Current State
`kiro-ai-quality-gate` は callable subworkflow として存在し、`kiro-impl` に統合済みである。PR #90 では、次の 6 点が重要な契約として確認された。

- `workflow_call` は bare name ではなく relative path で呼ぶ。
- routing vocabulary は built-in `ai-antipattern-review` に合わせる。
- ambiguous / blocked / inconsistent outcome 用の catch-all replan routing を置く。
- fix report は first-pass approval では生成されないため optional として扱う。
- loop exhaustion は、replan / repair 可能な経路がある場合に雑に `ABORT` しない。
- caller 側の `loop_monitors.cycle` には実際に挿入された gate step を含める。

他の Kiro workflow は、まだこの 6 点に対して体系的に評価されていない。Kiro spec generation workflow は独自の domain review / repair loop を持つ一方、Kiro status / validation workflow は read-only であり、edit-oriented な AI fix loop を持つべきではない。`kiro-discovery` や `kiro-spec-batch` のような orchestration / decomposition workflow は、artifact を書く場合でも、generation artifact review と同じ修正ループを無条件に共有してよいとは限らない。

## Desired Outcome
すべての Kiro workflow は、PR #90 の 6 点に対する分類結果を持つ。分類結果は、既存 gate で covered、generation-scoped gate が必要、orchestration として個別判断、read-only のため対象外、のいずれかである。gate 適用対象になった spec generation や edit workflow は、domain-specific review または finalize の前に、適切な AI quality gate を通す。read-only な validation / status workflow は read-only のまま維持し、修正ループを追加しない。

## Approach
Kiro 系に限定した AI quality gate coverage の rollout plan を作る。PR #90 で実証済みの callable gate pattern を出発点にするが、implementation-specific な fix instruction をそのまま流用せず、spec generation artifact 向けの修正スコープに適応させる。

まず `kiro-*` workflow の coverage inventory を作り、分類だけは全 Kiro workflow を対象にする。実際の gate 挿入は、AI が成果物を生成または修正し、その成果物が後続 review / finalize に渡る workflow に限定する。routing vocabulary、optional report、loop monitor、workflow call の契約が drift しないよう、validator と smoke coverage も追加または更新する。

## Scope
- **In**: `.takt/{en,ja}/workflows/kiro-*` workflow の coverage inventory、gate 適用対象 workflow と対象外 workflow の分類、対象 workflow で使う Kiro-specific facet、6 点の契約を enforce するための validator / test 更新、Kiro workflow ごとの in-scope / out-of-scope 分類の文書化。
- **Out**: `cc-sdd-*` workflow、`opsx-*` workflow、OpenSpec-compatible workflow、upstream `.agents/skills/kiro-*` source asset、`CC-SDD-CODEX.md` の直接編集、read-only validation / status workflow を edit workflow に変えること。

## Boundary Candidates
- `kiro-ai-quality-gate` と `kiro-iterative-implementation-workflow` が既に担っている Kiro implementation gate coverage。
- init、requirements、design、tasks、quick generation workflow 向けの Kiro spec-generation gate coverage。ただし `kiro-spec-init` は brief/template から最小 artifact を初期化する phase なので、gate 挿入が過剰なら分類上の対象外として明示する。
- discovery、batch、status、validate workflow に対する orchestration / read-only classification。特に discovery / batch は artifact を書く場合があるため、read-only と同列にせず、個別に gate 適用可否を判断する。
- routing vocabulary、optional report、loop monitor、workflow call の regression を防ぐ shared validator / runtime smoke contract。

## Out of Boundary
- この spec では `cc-sdd*` や `opsx*` に横展開しない。
- `.agents/skills/kiro-*` 配下の upstream Kiro skill asset は変更しない。
- roadmap checkbox marker を implementation progress として扱わない。
- read-only status / validation workflow に AI fix loop を追加しない。
- すべての `kiro-*` workflow に機械的に `workflow_call` を挿入しない。

## Upstream / Downstream
- **Upstream**: `kiro-ai-quality-gate`、`kiro-iterative-implementation-workflow`、`kiro-spec-generation-workflows`、`kiro-shared-workflow-contracts`、TAKT built-in の `ai-antipattern-reviewer`、`ai-antipattern`、`ai-antipattern-review`、callable `workflow_call` runtime behavior。
- **Downstream**: 将来追加される Kiro workflow、OpenSpec-compatible workflow への後続検討、Kiro workflow shape を enforce する validator / test suite。

## Existing Spec Touchpoints
- **Extends**: `kiro-ai-quality-gate`。reusable gate semantics と PR #90 の学びを引き継ぐ。
- **Extends**: `kiro-spec-generation-workflows`。requirements / design / tasks / quick generation routing を対象にする。
- **Extends**: `kiro-shared-workflow-contracts`。workflow shape validation と許可された callable subworkflow boundary を扱う。
- **Adjacent**: `kiro-discovery-batch-workflows`、`kiro-status-validation-workflows`、`kiro-workflow-surface`。自動的に変更せず、慎重に分類する。

## Constraints
対象は Kiro 系だけに限定する。TAKT 既存の callable subworkflow 機能を使い、独自 orchestration を再実装しない。read-only workflow は read-only のまま維持する。日本語・英語の workflow / facet が存在する場合は parity を保つ。prompt prose だけに頼らず、決定論的な validation または smoke coverage で wiring を検証する。
