# Gap Analysis: takt-sdd-global-cli

## 前提

- `spec.json` は `phase: requirements-generated`、`approvals.requirements.approved: false` のため、requirements は未承認である。
- 本レポートは実装判断ではなく、requirements と既存コードベースの差分を明示するための調査結果である。
- 調査対象は root package、installer、既存 TAKT assets、workflow helper scripts、CI、docs に限定した。

## Analysis Summary

`takt-sdd` を global npm CLI として公開するための主要 assets は一部存在するが、現状は repo-local npm scripts と `create-takt-sdd` installer が中心であり、root package 自体には global CLI の公開面が存在しない。

最大の gap は次の 4 点である。

- root package が `private: true` で、`bin`、packaging allowlist、CLI entrypoint を持たない。
- `create-takt-sdd` の asset sync policy は存在するが、remote tarball 前提の monolithic installer に近く、package-bundled asset source と共有する install core に分離されていない。
- `kiro-*` / `opsx-*` 実行は npm scripts と repo-local `scripts/kiro-staged.mjs` / `scripts/takt.sh` に依存しており、global CLI の `projectRoot` / `packageRoot` 分離、`--cwd`、preflight が未実装である。
- deterministic な npm pack / global install smoke と package artifact 境界検証が CI にない。

設計フェーズでは、既存 installer policy を壊さずに共有化するため、asset source を差し替え可能にした shared install core を作る案を優先候補にするのが妥当である。

## Current State Investigation

### Root Package

既存の root `package.json` は `takt-sdd` という package name を持つが、npm 公開向けではない。

- `private: true` のため npm publish 不可。
- `bin` がないため `npm install -g takt-sdd` 後の `takt-sdd` command は作られない。
- `files` がないため、package artifact の allowlist / denylist が定義されていない。
- runtime dependency として必要な `takt`、`@fission-ai/openspec`、`cc-sdd` の扱いが publish package 向けに整理されていない。
- `package-lock.json` の root version が `package.json` と drift しているため、packaging validation の前に同期確認が必要である。

現在の npm scripts は repo-local operation に最適化されている。

- `kiro:*` は `node scripts/kiro-staged.mjs ... --pipeline --skip-git -t` を呼ぶ。
- `opsx:*` は `scripts/takt.sh ... -w opsx-* -t` を呼ぶ。
- `cc-sdd:*` legacy scripts は残っている。

この surface は開発 repo 内では有効だが、global CLI の stable command contract とは別物である。

### Installer

`installer/src/install.ts` には TAKT asset install policy の中核がある。

- `.takt/.manifest.json` による file hash 管理。
- customized file skip。
- update 時の overwrite 判定。
- dry-run plan。
- package.json scripts / devDependencies merge。
- OpenSpec 固定 version 内部起動。
- cc-sdd 固定 version 内部起動。

一方、現状の installer は GitHub release tarball を asset source とする前提が強い。

- release tarball download と extract が install flow 内に組み込まれている。
- root package に同梱された `.takt` assets を source にする flow がない。
- `create-takt-sdd` は `--tag` を持つが、global `takt-sdd init` では `--tag` を非対応にする必要がある。
- `create-takt-sdd` は current cwd を target として扱うが、global `init <dir>` には target directory positional handling が必要である。

したがって installer policy は reusable だが、そのまま root CLI に流用すると remote tarball と global CLI の責務が混ざる。

### Workflow Execution

`scripts/kiro-staged.mjs` は workflow resolution の既存 pattern として有用である。

- `.takt/config.yaml` から language を読む。
- `.takt/workflows/<name>.yaml`、`.takt/<language>/workflows/<name>.yaml`、他言語 workflow の順で解決する。
- workflow path を `takt -w <path>` に渡す。

ただし repo-local 前提がある。

- `repoRoot` は script path から固定される。
- `scripts/takt.sh` が存在すればそれを優先する。
- `scripts/takt.sh` は repo root に cd し、repo の `node_modules/.bin/takt` または global `takt` を使う。
- global CLI に必要な `packageRoot` と `projectRoot` の分離、`--cwd`、package-local dependency binary の解決はない。

`takt-sdd kiro-discovery ...` のような CLI surface は、既存 workflow resolution を参考にしつつ新しい runtime adapter として実装する必要がある。

### TAKT Assets

`.takt/en/workflows` と `.takt/ja/workflows` には `kiro-*`、`opsx-*`、legacy `cc-sdd-*` 系の workflow assets が存在する。

global CLI の requirements では次の整理が必要である。

- `kiro-*` と `opsx-*` command は support 対象。
- old `cc-sdd-*` command と `run cc-sdd-*` は global CLI では reject 対象。
- compatibility のため package 内に legacy cc-sdd assets を含める可能性はあるが、CLI command surface としては非 support。

### CI and Tests

既存 CI は installer と workflow validators を広く実行しているが、global npm package としての検証はない。

既存の有用な test pattern:

- `installer/src/install.test.ts` は manifest policy、fixed cc-sdd version、lang propagation、dry-run、ordering を検証している。
- `tests/kiro-workflow-surface.test.mjs` は Kiro command catalog と legacy script separation を検証している。
- runtime smoke tests は fixture project を作り、mock provider で workflow smoke を走らせる pattern を持つ。

不足している検証:

- `npm pack` artifact contents の allowlist / forbidden file check。
- isolated prefix への package install 後、PATH 上の `takt-sdd --help` / `--version` check。
- `takt-sdd init . --dry-run` が network と write を行わないこと。
- uninitialized project での explicit preflight error。
- `cc-sdd-*` rejection。
- package-bundled assets からの init が manifest/update policy を保持すること。

## Requirement-to-Asset Map

| Requirement | Existing assets | Gap status | Notes |
| --- | --- | --- | --- |
| 1. npm global command surface | root `package.json` name/version, repo-local npm scripts | Missing | `private: true`、`bin` なし、CLI entrypoint なし、publish metadata 不足。 |
| 2. package-bundled asset init | `installer/src/install.ts` の sync policy、`.takt` assets | Partial | policy は存在するが remote tarball 前提。package-bundled source、`init <dir>`、`--tag` rejection が未実装。 |
| 3. installer manifest/update policy preservation | `syncRelativeFiles`、manifest hash、customized skip tests | Partial | policy はあるが共有境界が未整理。global init 用に再利用する際に tarball flow と分離が必要。 |
| 4. deps/version handling | root/installer deps、OpenSpec/cc-sdd constants | Constraint | `@fission-ai/openspec` requirement は 1.4.x だが installer constant は 1.3.1。fixed version source of truth が必要。 |
| 5. supported command surface | `.takt/*/workflows`、`scripts/kiro-staged.mjs`、npm scripts | Partial | command catalog はあるが global CLI parser と reject policy がない。 |
| 6. execution context/preflight | `kiro-staged` workflow resolution、`.takt/config.yaml` | Missing | `--cwd`、projectRoot/packageRoot separation、package-local `takt` resolution、project dependency preflight が未実装。 |
| 7. package artifact boundary | `.takt` assets、CI validators | Missing | `files` allowlist と forbidden contents validation がない。`.takt/runs` 等の exclusion を機械検証する必要がある。 |
| 8. deterministic validation/docs | installer tests、workflow tests、README | Partial | npm pack/global install smoke と docs update がない。README は `create-takt-sdd` 中心。 |

## Options

### Option A: Root CLI を追加し、installer 実装を最小限流用する

root に `bin/takt-sdd.mjs` を追加し、必要な install logic を `installer/src/install.ts` から import または薄く wrap する。

利点:

- 初期差分が比較的小さい。
- 既存 installer policy に近いコードを使いやすい。

欠点:

- remote tarball 前提と package-bundled asset source が混ざりやすい。
- installer package と root package の build/runtime 境界が曖昧になる。
- 長期的に `create-takt-sdd` と `takt-sdd init` の policy drift を起こしやすい。

Effort: M  
Risk: High

### Option B: Shared install core と root CLI adapter を作る

manifest/update/package.json merge などの policy を shared module に切り出し、asset source を差し替える。

- `RemoteReleaseAssetSource`: `create-takt-sdd` 用。
- `PackagedAssetSource`: global `takt-sdd init` 用。
- `InstallPolicy`: manifest、customized skip、dry-run、dependency merge、OpenSpec/cc-sdd init ordering。
- `WorkflowRunner`: `takt-sdd kiro-*` / `opsx-*` 用。

利点:

- `create-takt-sdd` の既存 policy を維持しやすい。
- global package と installer の責務を分離できる。
- package-bundled init と remote installer の差分を asset source に閉じ込められる。
- tests を policy 単位と CLI integration 単位に分けやすい。

欠点:

- 初期実装は Option A より大きい。
- installer の既存 tests を壊さずに module boundary を変える慎重さが必要。

Effort: L  
Risk: Medium

### Option C: Separate package workspace を作る

`packages/takt-sdd-cli` のような dedicated package を作り、root は monorepo 管理に寄せる。

利点:

- npm package boundary が明確。
- package artifact と runtime deps を独立管理しやすい。

欠点:

- 現在の repo structure と release flow を大きく変える。
- root package を `takt-sdd` として publish したい requirement と衝突しやすい。
- CI、docs、lockfile、installer との接続変更が増える。

Effort: XL  
Risk: Medium

## Recommendation for Design Phase

Option B を推奨する。

理由:

- requirements は `create-takt-sdd` の manifest/update/customized skip policy 維持を強く求めている。
- 同時に、global CLI は package-bundled assets、`--cwd`、projectRoot/packageRoot separation、command rejection という別の runtime contract を持つ。
- policy を共有し、asset source と CLI adapter を分けると、既存 installer の mental model を壊さずに global CLI を追加できる。

設計では次の component boundary を明示するべきである。

- `InstallCore`: manifest、sync、package.json merge、dry-run plan、ordering。
- `AssetSource`: remote release tarball と package-bundled directory の差し替え。
- `VersionPolicy`: `takt`、`@fission-ai/openspec`、`cc-sdd` の deterministic version source。
- `GlobalCli`: argument parsing、`init`、workflow command dispatch、help/version。
- `WorkflowResolver`: project `.takt/config.yaml` と language-aware workflow lookup。
- `ProcessRunner`: package-local `takt` binary、project-local openspec/cc-sdd preflight、spawn error formatting。
- `PackageArtifactValidator`: npm pack contents の allowlist / forbidden file check。

## Research Items Before Implementation

- `@fission-ai/openspec` の target version を 1.4.x のどの固定 version にするか。現状 root/installer deps は 1.4.1、installer constant は 1.3.1 で drift している。
- `takt` の fixed runtime version を root package dependency としてどう固定するか。現在 npm latest は 0.44.0 だが lock は 0.43.0 系である。
- `cc-sdd` の fixed version source of truth を root CLI と installer で共有するか。現状 installer は 3.0.2 を固定している。
- npm package `files` が dot directory `.takt` を含むときの exact pack contents。`npm pack --json` による deterministic validation が必要である。
- `.takt/ja` と `.takt/en` のどちらを package default とし、`init --lang` と existing `.takt/config.yaml` preservation をどう優先するか。
- `opsx-*` command の preflight で project-local `@fission-ai/openspec` を必須にするか、init 直後の package.json dependency だけを sufficient とするか。
- global CLI が `--pipeline --skip-git` を default inject する対象範囲。known `kiro-*` / `opsx-*` のみか、`run <workflow>` も含めるか。

## Suggested Validation Plan

- Add unit tests for CLI argument parsing:
  - `takt-sdd --help`
  - `takt-sdd --version`
  - `takt-sdd init <dir> --dry-run`
  - `takt-sdd kiro-discovery ...`
  - `takt-sdd opsx-propose ...`
  - rejection of `takt-sdd cc-sdd-full`
  - rejection of `takt-sdd run cc-sdd-full`
- Add install policy regression tests using a packaged asset fixture:
  - manifest hash write.
  - customized file skip.
  - update overwrite when hash matches previous manifest.
  - dry-run no writes.
- Add workflow dispatch smoke with mock process runner:
  - `--lang ja` resolves `.takt/ja/workflows`.
  - default command args include `--pipeline --skip-git`.
  - uninitialized project fails before spawning `takt`.
- Add npm package smoke:
  - `npm pack --json`.
  - install tarball into isolated prefix.
  - assert PATH command `takt-sdd --help` and `takt-sdd --version`.
  - assert forbidden files are not in tarball.
- Keep real provider workflow smoke optional and out of default CI.

## Open Risks

- The current root package is also the development package. Turning it into a publishable package may expose unintended files unless `files` validation is strict.
- If installer policy is copied instead of shared, `create-takt-sdd` and `takt-sdd init` will drift.
- If global workflow dispatch uses repo-local `scripts/takt.sh`, installed CLI behavior will depend on the source checkout and violate the packageRoot/projectRoot boundary.
- If `cc-sdd-*` assets are included for compatibility but the CLI also exposes them accidentally through generic `run`, unsupported commands will become observable API.
- If dependency versions are read from `latest` or loose ranges during init, init output will not be deterministic.

## Design Inputs

The design phase should treat the following as hard constraints.

- Do not remove or weaken `create-takt-sdd`.
- Do not break `.takt/.manifest.json` policy, customized skip, or update overwrite rules.
- Do not use GitHub release tarball for `takt-sdd init`.
- Do not auto-run `npm install` during init.
- Do not support `--tag` in `takt-sdd init`.
- Do not expose old `cc-sdd-*` workflow commands through global CLI.
- Do not require repo-local npm scripts or `scripts/takt.sh` for global command execution.
- Keep default workflow execution deterministic and CI-testable without real providers.
