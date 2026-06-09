# Brief: takt-sdd-global-cli

## Problem

takt-sdd 利用者は、npm global install 後に `takt-sdd` コマンドから `.takt/` 資産の展開と Kiro/TAKT サブコマンド実行を行いたい。現在は root package が `private: true` かつ `bin` を持たず、利用者向けの導線は `create-takt-sdd` installer と導入先 project の npm scripts に分かれている。そのため、`npm install -g takt-sdd` から `takt-sdd init .`、`takt-sdd kiro-discovery ...`、`takt-sdd opsx-propose ...` のように一貫した CLI surface を使うことができない。

## Current State

root `package.json` は `takt-sdd` という package 名を持つが、公開 npm package としては扱われておらず、CLI bin も定義されていない。`create-takt-sdd` は installer package として維持され、`installer/src/install.ts` が `.takt/` asset install、`.takt/.manifest.json` による file hash 管理、customized file skip、update 時の上書き判定、package scripts merge、OpenSpec/cc-sdd 初期化を担っている。Kiro workflow 実行は repo-local の `scripts/kiro-staged.mjs` が package root の `.takt` を解決し、`scripts/takt.sh` または `takt` を起動する形で実装されている。

## Desired Outcome

利用者が `npm install -g takt-sdd` した後、`takt-sdd init .` で対象 project に takt-sdd の `.takt/` workflow/facet 資産を展開できる。`create-takt-sdd` は従来通り維持され、既存 installer の manifest/update policy を壊さない。`takt-sdd` のサブコマンドは導入先 project の `.takt/` と `.kiro/` workspace を基準に動作し、repo-local 開発用 wrapper に依存しない形で TAKT workflow を起動できる。

primary CLI surface は `.agents/skills` と `.takt/*/workflows` の名前に 1:1 対応させる。例えば `$kiro-discovery` / `kiro-discovery.yaml` に対応する人間向け command は `takt-sdd kiro-discovery ...` とする。`kiro-*` と `opsx-*` は support 対象とし、旧 `cc-sdd-*` workflow は global CLI では非サポートとして明示的に拒否する。

## Approach

推奨アプローチは、root package を `takt-sdd` の公開 npm package にし、JavaScript ESM の thin CLI を追加することである。公開 artifact には `bin: { "takt-sdd": ... }`、必要な `.takt` assets、CLI 実行に必要な runtime dependency、不要な `.takt/runs` や開発専用 state を除外する package boundary を持たせる。

`create-takt-sdd` の責務は維持しつつ、install policy を共有可能な module へ整理して `takt-sdd init` からも再利用する。asset source だけを差し替え、`create-takt-sdd` は既存どおり GitHub release tarball source、`takt-sdd init` は npm package に同梱された `.takt/` source を使う。manifest/update/customized skip/package scripts merge/OpenSpec/cc-sdd 初期化 policy は同じ code path に寄せ、`takt-sdd init` 専用に manifest/update logic をコピーしてはならない。

`takt-sdd init <dir>` は profile/toggle なしの full initialization とする。初回 default language は `en`、update 時は既存 `.takt/config.yaml` の language を尊重し、明示 `--lang` で上書きする。global `init` は npm package 同梱 assets を source of truth とするため `--tag` を support しない。`init` は対象 project の `package.json` に `takt`、`@fission-ai/openspec@1.4.x`、`cc-sdd@3.x` を devDependencies として追加するが、`npm install` は自動実行しない。

target project に追加する `takt` devDependency は、installer が維持する npm scripts 互換と project-local direct execution のための依存である。global `takt-sdd` CLI runtime が TAKT workflow を起動するときは、下記の通り packageRoot 側の `takt` executable を優先する。

`init` が追加する dependency version は、実装時に root package metadata または installer source 内の明示定数を canonical source of truth として決める。浮動的に latest を解決したり、CLI 実行ごとに異なる version を選んだりしてはならない。

runtime サブコマンドは `process.cwd()` または global `--cwd <dir>` を project root として `.takt/{workflows,<lang>/workflows}` を解決し、TAKT を起動する。known command は常に `--pipeline --skip-git` を既定付与し、初期 release では git automation opt-in を提供しない。workflow 実行前には init 済みであることと project-local dependencies を preflight し、不足時は `takt-sdd init .` または `npm install` を促す明示 error で停止する。

runtime binary の所有境界は明示する。`takt-sdd` CLI が TAKT workflow を起動するための `takt` executable は `packageRoot` 側の runtime dependency を優先する。一方、workflow 内の opsx facets が明示的に使う `./node_modules/.bin/openspec` と、互換 npm scripts が参照しうる `cc-sdd` は `projectRoot` 側の devDependencies として preflight する。`takt`、`openspec`、`cc-sdd` の解決元を暗黙 fallback で混ぜてはならない。

CLI 実行では `projectRoot` と `packageRoot` を明示的に分離する。`projectRoot` は導入先 project の `.takt/`、`.kiro/`、`openspec/`、`package.json` を読む基準であり、`packageRoot` は global package 内の CLI、packaged assets、package-local runtime dependency を読む基準である。repo-local `scripts/takt.sh`、開発 checkout の current working directory、target project の `node_modules` を暗黙に混線させてはならない。

package artifact は allowlist または manifest validation で検証する。`npm pack` される asset は support する workflow/facet と互換 npm scripts が参照する最低限の `.takt` assets に限定し、`.takt/runs`、session state、persona sessions、logs、reports、provider credentials、開発専用生成物を含めてはならない。global install validation は `npm pack` した tarball を一時 npm prefix に install し、PATH 経由で `takt-sdd` command が生えることを確認する。

## Scope

- **In**: root `takt-sdd` npm global CLI の package/bin 設計、JavaScript ESM thin CLI、`takt-sdd init <dir>`、package 同梱 `.takt/` asset source、既存 installer install policy の共有化、projectRoot/packageRoot 分離、project-root 基準の workflow resolution、`kiro-*` / `opsx-*` command surface、`cc-sdd-*` global CLI 拒否、project dependency preflight、package files allowlist/manifest validation、`npm pack` tarball global install validation、dry-run/help/version/error handling、README/README.ja/COMMON の最小更新、node:test による deterministic tests
- **Out**: `create-takt-sdd` CLI の廃止または互換破壊、cc-sdd package/code の変更、TAKT workflow/facet の意味的再設計、OpenSpec workflow の統合、既存 `.takt/.manifest.json` schema の変更、`.coderabbit.yml` / `.coderabbit.yaml` の変更、npm publish automation や release pipeline 全体の構築、install profile/toggle の導入、TAKT git automation opt-in の導入

## Boundary Candidates

- Global CLI package boundary: npm に公開される `takt-sdd` package metadata、`bin`、runtime dependencies、files allowlist/denylist。
- Asset source boundary: `create-takt-sdd` の remote release source と `takt-sdd init` の packaged asset source。source だけを差し替え、install policy は共有する。
- Init/install boundary: `takt-sdd init <dir>` と `create-takt-sdd` が共有する install core。manifest/update/customized skip policy、dependency merge、OpenSpec/cc-sdd initialization policy はこの境界で一貫させる。
- Runtime command boundary: 導入先 project root の `.takt` を解決して package-local/project-local runtime に委譲する薄い CLI layer。repo-local `scripts/takt.sh` や package-root 固定 path に依存しない。
- Path ownership boundary: `projectRoot` は導入先 project の state と artifacts を所有し、`packageRoot` は global package の CLI/assets/runtime を所有する。両者を暗黙の `cwd` や repo-local script で混線させない。
- Support boundary: `kiro-*` と `opsx-*` を supported workflow とし、`cc-sdd-*` は global CLI で明示拒否する。互換 npm scripts/assets として残すこととは分けて扱う。
- Dependency/preflight boundary: `init` は devDependencies を追加するが install は実行しない。workflow 実行時に `npm install` 不足を検出して明示 error を出す。
- Package validation boundary: package files allowlist/manifest、forbidden runtime state の混入検出、`npm pack` tarball の一時 global install、PATH 経由 command surface の検証を所有する。
- Documentation and validation boundary: global install、init、subcommand examples、packaged files、dependency/preflight、deterministic smoke tests の説明と検証。

## Out of Boundary

- `create-takt-sdd` の既存 public CLI 名を置き換えること。
- cc-sdd CLI 自体の実装や package version policy を変更すること。
- Kiro workflow の生成品質、review gate、provider smoke の再設計。
- `.takt/` asset install の manifest schema や customized file skip policy を別物にすること。
- packaged asset source を dedicated template directory へ全面移行し、既存 `.takt` asset/install policy から切り離すこと。
- `.agents/skills/**` や Kiro spec generation rule 自体を変更すること。この spec は generated workflow consumer と CLI/package boundary を扱い、Kiro generation engine の文書生成規則は別変更として扱う。
- `cc-sdd-*` workflow を global `takt-sdd` CLI の supported command にすること。
- `takt-sdd init` で `npm install` を自動実行すること。
- `takt-sdd init` に `--tag`、`--no-openspec`、`--no-legacy-cc-sdd` などの profile/toggle を導入すること。
- TAKT の branch/commit/push automation を global CLI の初期 release で有効化すること。
- npm publish automation や release pipeline 全体の構築。必要なら後続 spec とする。

## Upstream / Downstream

- **Upstream**: `create-takt-sdd-fixed-cc-sdd` の installer behavior、既存 `installer/src/install.ts` の manifest/update policy、`kiro-workflow-surface` の canonical `kiro:*` surface、`.kiro/steering/product.md` と `.kiro/steering/tech.md` の package/workflow 方針
- **Downstream**: npm publish/release automation、global CLI を使った end-to-end smoke、README からの導入手順、将来的な install profile/toggle、TAKT git automation opt-in、旧 `cc-sdd:*` 互換 scripts/assets の削除判断、optional な dedicated template source への移行判断

## Existing Spec Touchpoints

- **Extends**: なし。この spec は既存 spec の内部修正ではなく、新しい公開 CLI/package boundary を扱う。
- **Adjacent**: `create-takt-sdd-fixed-cc-sdd` は installer の既存挙動と cc-sdd 内部起動を扱うため、`init` 実装はこの spec の挙動を壊してはならない。`kiro-workflow-surface` は `kiro:*` namespace と migration policy を扱うため、global CLI のサブコマンド名はその surface と矛盾してはならない。

## Constraints

- 日本語ドキュメントと英語ドキュメントの説明は意味的にそろえる。
- Node.js support は既存 installer と root tooling の条件に合わせる。
- `create-takt-sdd` はこれまで通り利用可能にする。
- `takt-sdd init .` は既存 installer の manifest/update policy を再利用し、重複実装で policy drift を起こさない。
- `takt-sdd init .` は npm package 同梱 `.takt/` assets を使い、GitHub release tag download や `--tag` を使わない。
- `takt-sdd init .` は package manager install を実行せず、`npm install` を次の手順として案内する。
- package artifact には `.takt/runs`、`.takt/session-state.json`、`.takt/persona_sessions.json`、local logs、開発専用出力を含めない。
- package artifact には互換 npm scripts が参照する `cc-sdd-*` workflow/facet を含める。ただし global CLI では `cc-sdd-*` を実行不可にする。
- package artifact の include/exclude は allowlist または manifest validation で検証し、forbidden runtime state や provider credentials の混入を CI で検出する。
- `takt-sdd` runtime command は導入先 project の `.takt/config.yaml` language preference を尊重する。
- `takt-sdd` workflow command は `kiro-*` と `opsx-*` を 1:1 で提供し、常に `--pipeline --skip-git` を付与する。
- `takt-sdd` workflow command は `.takt/config.yaml`、language-specific workflow/facet assets、必要な project-local dependency が不足する未 init project を自動修復せず、明示 error で停止する。
- `takt-sdd` workflow command の `takt` executable は packageRoot 側を優先し、opsx が要求する `openspec` と互換用 `cc-sdd` は projectRoot 側の `node_modules/.bin` presence を検査する。
- deterministic validation は `npm pack` tarball を一時 npm prefix に install し、`takt-sdd --help`、`takt-sdd init . --dry-run`、未初期化 project preflight、`cc-sdd-*` 拒否、package forbidden file exclusion を確認する。
- real provider smoke は CI 必須条件にせず、mock/deterministic path を CI 対象にする。
