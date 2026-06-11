# Roadmap

## Overview

takt-sdd は、cc-sdd v3 由来の Kiro-style SDD を、プロンプト手順ではなく TAKT の workflow YAML、facet、output contract で実行できる形へ移行します。`.kiro/steering/` と `.kiro/specs/` は利用者が読む spec workspace として維持し、実行順序、分岐、検証、レビュー、デバッグ、完了判定は TAKT workflow が担います。

この変更は破壊的変更として扱います。旧 `cc-sdd:*` を主入口に残すのではなく、`kiro:*` script と Kiro-compatible な TAKT workflow を新しい正規 surface にします。

## Approach Decision

- **Chosen**: TAKT ネイティブな Kiro workflow を、責務別の複数 spec として段階実装する
- **Why**: OpenSpec change は公開 API、共通契約、status/validation、spec 生成、discovery/batch、implementation までまたがるため、単一 spec では実装・レビュー・検証単位が大きすぎるためです。低リスクな read-only workflow から始め、artifact 生成、batch、最後に code edit を伴う implementation workflow へ進めます。
- **Rejected alternatives**: 単一 spec にまとめる案は、30 近いタスクが 1 つの review scope に集まり、境界の重複や回帰の切り分けが難しくなるため採用しません。旧 `cc-sdd:*` を正規 API として維持する案は、破壊的変更の境界が曖昧になり、Kiro-compatible workflow surface への移行を遅らせるため採用しません。

## Scope

- **In**: `kiro:*` script と major-version surface、Kiro workflow 共通契約、status/validation workflow、spec generation workflow、discovery/batch workflow、iterative implementation workflow、関連ドキュメントと検証
- **Out**: OpenSpec と `.kiro/*` artifact の統合、旧 cc-sdd command install との prompt-level compatibility、最初の slice で全 workflow を一括実装すること、TAKT facet で安全に置き換えられる prose 手順の完全保存

## Constraints

- 生成する spec 文書は、日本人が自然に読める日本語で書きます。
- `.kiro/steering/` と `.kiro/specs/` は Kiro-compatible artifact contract として維持します。
- `.claude/skills/kiro-*` と `.agents/skills/kiro-*` は source asset として扱い、runtime control plane そのものにはしません。
- `kiro-impl`、`$kiro-impl`、`/kiro-impl` のような呼び出し表現は、同じ skill identity に正規化します。
- OpenSpec workflow は分離したまま維持します。
- Kiro-specific facet は `node_modules/takt/builtins/{lang}/facets` の既定 facet を優先的に再利用し、`extends` による差分記述が可能な場合は親 facet の全文コピーを避けます。

## Boundary Strategy

- **Why this split**: 公開 surface、共通契約、読み取り専用 workflow、artifact 生成 workflow、batch orchestration、code edit を伴う implementation workflow は失敗モードと検証方法が異なります。依存順に分けることで、後続 spec が前段の契約を使い回せます。
- **Shared seams to watch**: `spec.json` phase/approval 更新、`.kiro/steering/` 読み込み、skill identity resolution、output contract のタグや構造、built-in facet inheritance、workflow/facet validation、README と agent guidance の表現

## Specs (dependency order)

- [x] kiro-workflow-surface -- major version、`kiro:*` script、移行ドキュメントを整備する。 Dependencies: none
- [x] kiro-shared-workflow-contracts -- Kiro workflow 共通の output contract、skill identity resolver、`.kiro/*` 操作規約を整備する。 Dependencies: kiro-workflow-surface
- [x] kiro-status-validation-workflows -- `kiro-spec-status` と `kiro-validate-*` を TAKT workflow として実装する。 Dependencies: kiro-shared-workflow-contracts
- [x] kiro-spec-generation-workflows -- `kiro-spec-init`、requirements/design/tasks/quick 系の spec 生成 workflow を実装する。 Dependencies: kiro-shared-workflow-contracts
- [x] kiro-discovery-batch-workflows -- `kiro-discovery`、`kiro-spec-batch`、cross-spec review を実装する。 Dependencies: kiro-spec-generation-workflows
- [x] kiro-iterative-implementation-workflow -- `kiro-impl` と内部 review/debug/verify gate を実装する。 Dependencies: kiro-status-validation-workflows, kiro-spec-generation-workflows
- [x] takt-sdd-global-cli -- `takt-sdd` グローバル CLI（init / kiro command / run）と package artifact 検証を整備する。 Dependencies: kiro-iterative-implementation-workflow
- [x] retire-legacy-workflow-surface -- cc-sdd-* / opsx-* を退役し kiro-* のみの v2.0.0 surface にする。update 後始末と不在強制検証を含む。 Dependencies: takt-sdd-global-cli

## Status Note (2026-06-11)

- v2.0.0 で `cc-sdd-*` / `opsx-*` workflow と `cc-sdd:*` / `opsx:*` scripts は退役済み。Constraints の「OpenSpec workflow は分離したまま維持します」は退役により失効した（履歴として残置）。
- OpenSpec（opsx）workflow の再提供は後続 spec が所有する（未着手）。
