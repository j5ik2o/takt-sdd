{extends: plan}

# Kiro Spec Quick Instruction

## Kiro 固有差分

Kiro spec generation phases を 1 つの workflow 内で compose する。quick path は `quick-init`、`quick-requirements`、`quick-design`、`quick-tasks`、`quick-sanity-review` をこの順に実行し、各 phase は standalone workflow と同じ instruction、policy、output contract の basename を使う。別 workflow runner へ委譲しない。

## Inputs

- invocation feature description または feature name。
- optional の `.kiro/specs/<feature>/brief.md`。
- phase を再開する場合の existing `.kiro/specs/<feature>/spec.json`、`requirements.md`、`design.md`、`research.md`、`tasks.md`。
- requested mode: `automatic mode` または `interactive mode`。
- `interactive mode` で使う明示的な `phase approval` decision。
- fast-track approval semantics が要求された場合の明示的な `auto-approve` mode。

## Quick composition procedure

1. `quick-init` は `kiro-spec-init` standalone workflow instruction、`kiro-spec-generation` policy、`kiro-spec-generation-result` output contract で実行する。
2. `quick-requirements` は `kiro-spec-requirements` standalone workflow instruction、`kiro-spec-generation` policy、`kiro-spec-generation-result` output contract で実行する。
3. `quick-design` は `kiro-spec-design` standalone workflow instruction、`kiro-spec-generation` policy、`kiro-spec-generation-result` output contract で実行する。
4. `quick-tasks` は `kiro-spec-tasks` standalone workflow instruction、`kiro-spec-generation` と `kiro-spec-task-annotations` policies、`kiro-spec-generation-result` output contract で実行する。
5. tasks generation 後に `quick-sanity-review` を実行し、`kiro-spec-sanity-review` output contract を使う。

## Mode behavior

- `automatic mode` では、成功した phase 間で user approval のために停止せず、`quick-init` から `quick-requirements`、`quick-design`、`quick-tasks`、`quick-sanity-review` へ連続実行する。
- `interactive mode` では init から requirements、requirements から design、design から tasks へ進む前に明示的な `phase approval` を要求する。approval がない、または拒否された場合は停止し、次に必要な approval を報告する。
- design と tasks phase は standalone workflow contract と same auto-approve semantics を使う。design は `-y` または `auto-approve` が有効な場合だけ `approvals.requirements.approved: true` を設定できる。tasks は同じ明示 semantics の下でのみ `approvals.requirements.approved: true`、`approvals.design.approved: true`、`approvals.tasks.approved: true`、`ready_for_implementation: true` を設定できる。

## Completion gate

- `quick-sanity-review` は requirements、design、tasks の coherence、hidden prerequisite drift、task annotation coverage を確認する。
- `verdict PASS` だけが quick workflow の completion を許可する。
- `NEEDS_FIX` は報告された `fix_targets` へ進める。
- `BLOCKED` は completion を止め、`blockingReason` を報告する。
- quick path は discovery、batch、implementation execution を呼ばない。local spec generation phase contract の composition だけを扱う。

## Result mapping

- completion 時は `phase: "tasks"`、`validation.verdict: "PASS"`、tasks phase の auto-approve result に従った `ready_for_implementation`、`quick-completion` の evidence を返す。
- どれかの phase が失敗した場合は、その standalone contract の phase output を返し、後続 phase を飛ばさない。
- evidence には 5 つの quick step、selected mode、interactive mode の全 phase approval decision、design/tasks の auto-approve handling、final sanity review `verdict`、discovery、batch、implementation execution を呼んでいないことを記録する。
