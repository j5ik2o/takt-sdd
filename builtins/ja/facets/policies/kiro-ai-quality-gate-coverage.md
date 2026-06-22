# Kiro AI Quality Gate Coverage Policy

Full custom reason: upstream Kiro skills do not define TAKT-specific AI quality gate coverage categories, caller eligibility, or roadmap marker semantics.

## Canonical Inventory

- workflow ごとの分類正本は machine-readable な `scripts/kiro-ai-quality-gate-contracts.mjs` に置く。
- この policy は category semantics と operator 向け判断基準だけを説明する。
- workflow ごとの inventory table をこの policy に再掲しない。分類の正本は 1 つに保つ。

## Category Semantics

- `existing_gate_coverage`: workflow が承認済み AI quality gate をすでに所有または呼び出している。
- `discovery_artifact_gate_required`: workflow が discovery reporting へ進む discovery artifacts を書くため、discovery-scoped AI quality gate を通す必要がある。
- `generation_scoped_gate_required`: workflow が domain review または lifecycle promotion へ進む spec artifact を生成または修正する。
- `orchestration_decision_required`: workflow が planning / coordination artifact を書くため、AI review / fix loop 追加前に maintainer decision が必要である。
- `orchestration_delegated`: artifact-level AI quality review は orchestration workflow ではなく隣接する generation workflow が所有する。
- `read_only_out_of_scope`: workflow は state の read / validate / report だけを行い、edit-capable AI fix behavior を追加してはならない。
- `intentionally_not_applicable`: workflow には AI quality gate を挿入する stable generated artifact review boundary がない。
- `maintainer_decision_required`: available evidence だけでは covered または intentionally out of scope と分類できない。

## Eligibility Rules

- generated / repaired artifact が domain-specific review または finalization へ進む場合だけ AI quality gate を追加する。
- read-only workflow は read-only のまま保つ。coverage を満たすために repair、debug、edit、nested workflow behavior を追加しない。
- orchestration workflow は automatic gate target ではなく explicit design decision として扱う。Discovery artifact gate は `scripts/kiro-ai-quality-gate-contracts.mjs` に列挙されている場合だけ許可する。
- `roadmap checkbox` は spec generation state を示すだけである。implementation progress evidence ではなく、coverage classification を駆動してはならない。
- 新しい Kiro workflow が artifact boundary と operator-visible responsibility から分類できない場合は `maintainer_decision_required` を返す。
