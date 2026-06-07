# Kiro Spec Generation Policy

Full custom reason: built-in policies do not define Kiro `.kiro/specs/<feature>` phase gates, artifact write rules, or `spec.json` metadata updates.

## Scope

- この policy は standalone `kiro-spec-init`、`kiro-spec-requirements`、`kiro-spec-design`、`kiro-spec-tasks`、`kiro-spec-quick` の phase step にだけ適用する。
- artifact の読み書きは `.kiro/specs/<feature>/` 配下に閉じる。
- roadmap、OpenSpec、discovery、batch orchestration、implementation execution の挙動をこの policy に取り込まない。

## Phase Gate

- 各 phase の前に `featureName` を `.kiro/specs/<feature>` へ解決し、現在の `spec.json` lifecycle state を確認する。
- `initialized` は init が `spec.json` と draft `requirements.md` を整合して書ける場合だけ生成できる。
- `requirements-generated` は initialized feature と、blocked ではない `requirements.md` generation result を必要とする。
- `design-generated` は generated requirements と、事前の human approval または requirements に対する明示的な auto-approve handling を必要とする。
- `tasks-generated` は generated design と、requirements/design に対する事前の human approval または明示的な auto-approve handling を必要とする。
- phase gate が失敗した場合は blocking result を返し、`phase`、approvals、`ready_for_implementation` を進めない。

## Artifact Write

- 現在 phase が所有する artifact だけを書く。init は `spec.json` と draft `requirements.md`、requirements は `requirements.md`、design は `design.md` と optional の `research.md`、tasks は `tasks.md` を扱う。
- `brief.md` は input context として保持し、implementation artifact として扱わない。
- spec generation の成功条件として `.kiro/specs/<feature>` 外の file を更新しない。
- artifact を安全に書けない場合は `BLOCKED` または `NEEDS_FIX` を返し、対象 path を `updatedFiles` に含めない。

## Metadata Update

- 成功した artifact write と同じ phase result で `spec.json` を更新する。
- 対応する artifact write と review gate が成功した後だけ、`phase` を `initialized`、`requirements-generated`、`design-generated`、`tasks-generated` のいずれかへ進める。
- 完了した phase の `approvals.*.generated` は shared Kiro spec lifecycle policy に従って更新する。
- `approvals.*.approved` は human approval または明示的な `auto-approve` mode の後だけ true にする。
- `ready_for_implementation` は `phase` が `tasks-generated` で tasks が approved の場合だけ true にする。

## Blocking Result

- ambiguity、lifecycle inconsistency、required input の欠落、feature name conflict、review gate failure により安全な phase transition ができない場合は `BLOCKED` を返す。
- generated artifact はあるが lifecycle を進める前に修正が必要な場合は `NEEDS_FIX` を返す。
- すべての `BLOCKED` result に `blockingReason` を含め、成功状態の metadata は変更しない。
- caller が次に実行すべき approval、correction、phase command を `nextAction` に入れる。
