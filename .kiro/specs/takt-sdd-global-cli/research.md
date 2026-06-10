# Research: takt-sdd-global-cli

## 要約

- **機能**: `takt-sdd-global-cli`
- **ディスカバリー範囲**: 拡張（既存 installer / workflow 資産への統合を中心とした light discovery + 設計フェーズ追加調査）
- **主要な発見**:
  - GitHub release tarball の展開結果（`.takt/` + `scripts/kiro-staged.mjs` + `package.json`）と、files allowlist を持つ公開 npm package の packageRoot は同型である。したがって asset source は interface 階層ではなく「staged directory + version」というデータとして抽象化できる。
  - `.takt/config.yaml` は現行 installer では生成されない。preflight 要件（6.5）と language preference 要件（2.5–2.7, 6.6）を満たすには、global init が language preference の導入・更新を所有する必要がある。
  - `kiro-steering` / `kiro-steering-custom` は npm script は存在するが workflow YAML 資産が存在しない（staged surface）。global CLI の公開 command catalog は「workflow 資産が package に同梱されている command」に限定しなければならない。
  - installer 定数 `OPENSPEC_VERSION = "1.3.1"` と root devDependency `@fission-ai/openspec@1.4.1` が drift している。requirements は 1.4.x を要求するため、version source of truth の一本化が必要。

---

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

---

# 設計フェーズ調査ログ（kiro-spec-design）

## 調査ログ

### Packaged asset source と extracted tarball の同型性

- **背景**: 「asset source だけを差し替え、install policy は共有する」(brief) を最小の改修で実現する方法を確定する必要があった。
- **参照した情報源**: `installer/src/install.ts`（特に `install()` の staging 後の処理）、root `package.json`、`.takt/` の実ディレクトリ構成。
- **発見**:
  - `install()` は staging 後、`extractedDir` 配下の `.takt/<lang>/{workflows,facets/*}`、`scripts/kiro-staged.mjs`、`package.json`（devDependencies の merge source）だけを参照する。
  - files allowlist（`.takt/en/`、`.takt/ja/`、`scripts/kiro-staged.mjs` を含む）を持つ公開 npm package の packageRoot は、この参照形と完全に一致する。
  - remote 固有の処理は `tar` presence check、tag 解決、download、extract のみで、すべて staging 前段に閉じている。
- **含意**: asset source は `{ rootDir, version }` のデータ契約で表現でき、`RemoteReleaseAssetSource` / `PackagedAssetSource` のクラス階層は不要。install core は「staged root を受け取る関数」へ切り出すだけで共有できる。

### `.takt/config.yaml` と language preference の所有権

- **背景**: requirements 2.5–2.7 / 6.5 / 6.6 は `.takt/config.yaml` の language preference を参照するが、現行 installer は config.yaml を生成しない。
- **参照した情報源**: `scripts/kiro-staged.mjs`（`configuredLanguage`: `^language:\s*(en|ja)\s*$` を読む）、`.takt/config.yaml`（開発 repo のもの。provider/model 等のユーザー所有設定を含む）、`installer/src/install.ts`（manifest に `lang` を記録）。
- **発見**:
  - config.yaml は provider/model 等を含むユーザー所有ファイルであり、manifest 管理（hash 追跡）に入れると初回更新で「customized 扱い」となり以後一切更新できなくなる。
  - manifest には `lang` フィールドが既に存在し、create-takt-sdd で導入された project の language preference の手掛かりになる。
  - `kiro-staged.mjs` の言語解決は preference 不在時に ja 優先 fallback という repo 開発向けの暗黙挙動を持つ。
- **含意**: config.yaml は manifest 管理外。当初は global init による「language line のみの外科的 upsert」を設計したが、ユーザーレビュー（2026-06-10）で「config.yaml は完全にユーザー所有（global `~/.takt/config.yaml` または project でユーザーが作成・管理）。CLI は読み取りのみ」と方針決定し、language の記録は manifest（CLI 所有）に委ねる形へ改訂した（判断 3 改訂を参照）。workflow 実行時の言語解決は fallback なしの strict 解決にする（後述の設計判断を参照）。

### 公開 command catalog の確定

- **背景**: requirements 5.1/5.2 の「公開 command set」を、実在する資産と矛盾なく定義する必要があった。
- **参照した情報源**: `.takt/en/workflows/`・`.takt/ja/workflows/`（両者は同一ファイル集合）、root `package.json` の `kiro:*` scripts、`.agents/skills/` の skill 一覧、brief の「skills / workflows 名と 1:1」方針。
- **発見**:
  - workflow 資産: kiro-* 15 個、opsx-* 5 個、cc-sdd-* 10 個。
  - `kiro-steering` / `kiro-steering-custom` は npm script と skill は存在するが workflow YAML が存在しない（staged surface）。
  - `kiro-ai-quality-gate` / `kiro-discovery-ai-quality-gate` / `kiro-spec-ai-quality-gate` は workflow YAML は存在するが対応する skill / npm script がなく、検証用の内部 workflow である。
- **含意**: 公開 catalog は「skill と workflow 資産の両方が存在する」12 個の kiro-* と 5 個の opsx-* に確定する。`run <workflow>` も同じ catalog で制限する（5.5）。catalog ⊆ 同梱資産 を drift test で固定する。

### Version source of truth

- **背景**: requirement 4.1–4.3（takt / `@fission-ai/openspec@1.4.x` / `cc-sdd@3.x` の deterministic な devDependencies 追加）と、既存の version drift（installer 定数 1.3.1 vs root devDep 1.4.1）の解消。
- **参照した情報源**: `installer/src/install.ts`（`OPENSPEC_VERSION`、`CC_SDD_VERSION`、`sddDevDependencies` の merge ロジック）、root / installer の `package.json`。
- **発見**:
  - merge される devDependencies の実体は asset root の `package.json` devDependencies 全件であり、現状 `cc-sdd` を含まない（requirement 4.1 と gap）。
  - 全件 merge は将来 root に開発専用 devDependency を足したとき対象 project へ漏れる latent bug でもある。
  - `OPENSPEC_VERSION` 定数は「installer 同梱 openspec を直接使うか npm exec するか」の分岐にのみ使われ、実際に対象へ伝播する version は asset root package.json 由来。現状は 1.3.1 ≠ 1.4.1 のため常に npm exec 経路に落ちている。
- **含意**: SDD dependency set を明示 allowlist（`takt`、`@fission-ai/openspec`、`cc-sdd`）で root package.json（dependencies ∪ devDependencies）から抽出する関数に置き換える。root に `cc-sdd` を追記し、`OPENSPEC_VERSION` を 1.4.1 に揃え、定数と package.json の整合を test で固定する。

### 最小 `.takt/config.yaml`（language のみ）の TAKT runtime 互換性

- **背景**: 設計判断 3 は config.yaml 不在時に `language: <lang>` のみの最小ファイルを生成する。provider 等を持たない config.yaml を takt が許容するかの裏取り（validate-design レビューで実施、2026-06-10）。
- **参照した情報源**: `node_modules/takt`（0.43 系）の `dist/infra/config/project/projectConfig.js`、`dist/infra/config/providerReference.js`、`dist/infra/config/loaders/agentLoader.js`。
- **発見**:
  - project config の全 key（`provider`、`model`、`language` ほか）は optional として destructure される。
  - `normalizeConfigProviderReferenceDetailed` は `provider === undefined` を明示的に処理し（`providerSpecified: false`）、下流のフォールバック（global config / 既定値）に委ねる。
  - `language` 不在時は `resolveConfigValue(cwd, 'language') ?? 'en'` で `en` に既定化される。
- **含意**: 全 key が optional のため、project `.takt/config.yaml` は takt 実行の必須前提ではない（global config / 既定値へ fallback する）。この事実は判断 3 改訂（config.yaml の read-only 化と preflight presence check の廃止）を直接支える。takt version 更新時の回帰は exact pin（判断 7）と global install smoke が防波堤になる。

### takt binary の解決と spawn 形態

- **背景**: requirement 4.4 / 6.3 / 6.4（repo-local wrapper 非依存、packageRoot/projectRoot 非混線）。
- **参照した情報源**: `scripts/takt.sh`（repo root へ cd し repo の node_modules/.bin/takt を優先）、`scripts/kiro-staged.mjs`（takt.sh があれば優先）、npm の bin 解決仕様。
- **発見**: 既存 wrapper はすべて repo checkout 前提で、global CLI には流用できない。`createRequire` + `require.resolve("takt/package.json", { paths: [packageRoot] })` で packageRoot 側 takt を決定論的に解決でき、bin script を `process.execPath` 経由で spawn すれば PATH や shebang に依存しない。
- **含意**: WorkflowRunner は packageRoot 固定の takt 解決を実装し、`cwd: projectRoot` で spawn する。projectRoot 側 `node_modules/.bin` は opsx 用 `openspec` 等の preflight 検査にのみ使う。

## アーキテクチャパターン評価

Gap Analysis の Option A/B/C（上記参照）のうち **Option B（shared install core + root CLI adapter）** を採用する。設計フェーズでの精緻化:

| 観点 | Gap Analysis 時点の想定 | 設計での確定 |
|------|------------------------|--------------|
| AssetSource | interface + 2 実装クラス | `{ rootDir, version }` のデータ契約に単純化。remote staging は既存 `install()` 内に残す |
| shared core の置き場所 | 未定 | `installer/src/install.ts` 内で `installFromSource()` として切り出し、root package artifact に `installer/dist/` を同梱して再利用 |
| WorkflowResolver | kiro-staged.mjs の再利用候補 | fallback 意味論が異なるため CLI 側に strict resolver を新設（意図が異なる重複は許容） |
| VersionPolicy | 専用 module 候補 | root package.json を正本とする allowlist 抽出関数 + 整合 test に縮小 |

## 設計判断

### 判断 1: shared install core は installer/src に置き、root package が `installer/dist/` を同梱する

- **背景**: install policy の単一 code path 維持（brief 制約）と、create-takt-sdd（TypeScript / 独立 publish）・root CLI（JS ESM）の両方からの利用。
- **検討した代替案**:
  1. policy を root の JS ESM に移し installer が import — installer の TS build/test 構成を壊し、既存 `install.test.ts` の移植コストが大きい。
  2. root package が `create-takt-sdd` を npm dependency として参照 — 公開 package 間の version 結合と publish 順序問題を生む。
  3. root artifact に `installer/dist/`（compiled JS）+ `installer/package.json` を同梱し、CLI が相対 import する。
- **採用したアプローチ**: 案 3。root `package.json` の `prepack` で installer build を保証する。
- **根拠**: policy code は 1 箇所（installer/src）のまま。既存 tests と create-takt-sdd の build/publish flow が無変更で残る。installer は runtime 依存が node builtins + `@fission-ai/openspec` のみで同梱コストが小さい。
- **トレードオフ**: takt-sdd package に create-takt-sdd の compiled code が含まれる（数十 KB）。dev checkout では CLI 実行前に installer build が必要（prepack / pretest hook で吸収）。
- **フォローアップ**: `npm pack` artifact に `installer/dist/**/*.test.js` が混入しないこと（negation pattern + validator）。

### 判断 2: asset source は `{ rootDir, version }` のデータ契約

- **背景**: 調査ログ「同型性」参照。
- **採用したアプローチ**: `installFromSource(options, source)` を core 契約とし、create-takt-sdd は staging（tar check / tag 解決 / download / extract）後に委譲、global init は `{ rootDir: packageRoot, version: packageVersion }` を渡す。
- **根拠**: 実装が 1 つしかない interface 階層を排した最小設計（synthesis: simplification）。`--tag` / GitHub download / `tar` 依存が remote 経路に閉じ、requirement 2.2 / 2.3 が構造的に保証される。
- **トレードオフ**: 将来第 3 の source が必要になれば関数分解の再検討が要るが、現 requirements にはない。

### 判断 3: language preference の解決順序と config.yaml の read-only 化（改訂）

- **背景**: requirements 2.5–2.7、6.5、6.6。create-takt-sdd で導入済み（config.yaml なし・manifest あり）の project の更新で言語が暗黙に en へ倒れる事故を防ぐ。
- **検討した代替案**:
  1. init が config.yaml の language line を外科的に upsert する（当初案）— CLI とユーザーで config.yaml の所有が部分的に重なる。
  2. config.yaml を完全にユーザー所有とし、CLI は読み取りのみ・language の記録は manifest に委ねる。
- **採用したアプローチ**: 案 2（ユーザーレビューで決定、2026-06-10）。init の言語解決は `--lang` 明示 > 既存 `.takt/config.yaml` の `language:`（read-only）> 既存 manifest の `lang` > `en`。CLI は config.yaml を作成・変更せず、導入言語は manifest の `lang` に記録する（共有 core の既存挙動）。既存 config.yaml の language と導入言語が異なる場合は警告のみ表示する。takt は project config.yaml なしでも global config / 既定値で動作するため（次節の調査ログ参照）、preflight の config.yaml presence check は不要であり、requirements 6.5 の preflight 項目から `.takt/config.yaml` を削除した。
- **根拠**: config.yaml は provider/model 等を含むユーザー設定であり、所有権を完全にユーザー側へ置くことで部分書き込みによる混在所有（hidden shared ownership）を排除できる。create-takt-sdd 導入済み project が追加 init なしで global workflow command を使える利点もある。
- **トレードオフ**: config.yaml の `language:` と manifest の `lang` が不一致になりうる（workflow 解決は常に config.yaml 優先 = 6.6。init 時の警告で可視化する）。
- **フォローアップ**: 不一致警告の文言確定と、「init が config.yaml を作成・変更しない」ことの test 固定。

### 判断 4: `--pipeline --skip-git` は run 形式を含む全 supported command に一律付与

- **背景**: requirement 5.3 は supported workflow command への一律付与を要求する。一方、既存 npm script `opsx:explore` のみ `--pipeline` なしで運用されている。
- **採用したアプローチ**: global CLI は `takt-sdd opsx-explore` を含む全 supported command と `run <supported-workflow>` に `--pipeline --skip-git` を付与する。interactive な explore 運用は従来どおり npm script（互換 surface）に残す。
- **根拠**: acceptance criterion の文言が一律付与を明示しており、global CLI の契約は deterministic / CI-testable を優先する。
- **トレードオフ**: npm script 経由と global CLI 経由で opsx-explore の実行モードが異なる。documentation（8.7）に明記する。

### 判断 5: workflow 解決は strict（言語間 fallback なし）

- **背景**: `kiro-staged.mjs` は他言語 fallback を持つが、requirement 6.5 は「language-specific workflow/facet assets 不足時は自動修復せず停止」、6.6 は「language preference の尊重」を要求する。
- **採用したアプローチ**: CLI 側 resolver は `.takt/workflows/<name>.yaml` →（なければ）`.takt/<lang>/workflows/<name>.yaml` の 2 候補のみ。どちらも無ければ preflight error（`takt-sdd init .` を案内）。
- **根拠**: fallback は「configured language の資産不足」を隠蔽し 6.5 と矛盾する。`kiro-staged.mjs` の fallback は repo 開発向けの別意図であり、字面類似でも共通化しない（intent-based dedup）。
- **トレードオフ**: resolver の小さな重複が installer 資産（kiro-staged.mjs）と CLI に併存する。意図差をコメントと test で明示する。

### 判断 6: 公開 catalog は静的 allowlist（12 kiro + 5 opsx）+ 資産整合 drift test

- **背景**: 調査ログ「公開 command catalog の確定」参照。
- **採用したアプローチ**: `cli/command-catalog.mjs` に静的配列で定義し、除外資産も `EXCLUDED_WORKFLOWS`（legacy: `cc-sdd-*` / internal: `*-ai-quality-gate`）として静的に分類する。node:test の**双方向** drift test で (a) 各 catalog entry に en/ja 両方の workflow YAML が package 同梱されること、(b) `cc-sdd-*` が catalog に決して含まれないこと、(c) 同梱 workflow 資産の全数が catalog または除外分類のいずれかに属し、未分類の新規資産はテスト失敗になること、を固定する。`kiro-steering` / `kiro-steering-custom`（資産未実装）は catalog 外とし、`run` でも実行不可。
- **根拠**: 動的 scan は同梱物の変化で公開 surface が暗黙に変わる。静的 + 双方向 drift test が deterministic validation（requirement 8）と整合し、資産追加時に「公開するか除外するか」の明示判断を強制する。
- **トレードオフ**: workflow 追加時に catalog または除外分類の手動更新が必要（その代わり追加漏れは構造的に検出される）。
- **フォローアップ**: kiro-steering workflow 資産が将来追加されたら、双方向 drift test の失敗を契機に catalog へ追加する後続変更。
- **改訂履歴**: validate-design レビュー（2026-06-10）で片方向 drift test の追加漏れリスクが指摘され、双方向 + 除外分類方式へ改訂。

### 判断 7: root package の dependency 配置と pin 方針

- **背景**: requirement 1.4 / 4.1–4.3、global install smoke の決定論。
- **採用したアプローチ**: root `package.json` を `dependencies: { takt: <exact>, "@fission-ai/openspec": "1.4.1" }`、`devDependencies: { "cc-sdd": "3.0.2", ... }` に再編し、SDD dependency set は allowlist 抽出（判断 4 の調査参照）。CLI runtime が必要とするのは takt（spawn）と openspec（init 内部起動）のみ。cc-sdd init は従来どおり pinned `npm exec` を維持する。
- **根拠**: exact pin により同一 package version → 同一導入結果（4.2/4.3）。`latest` 等の floating 解決は存在しない。
- **トレードオフ**: takt の更新が publish を要する。Renovate 等の既存 dependency 更新フローで追従する。
- **フォローアップ**: takt の exact version は実装時に lockfile と整合する値（0.43 系現行）で確定する。

### 判断 8: CLI 自体の文言は英語、init flow のメッセージは既存 i18n を再利用

- **背景**: requirements は CLI メッセージの言語を規定しない。installer には en/ja の i18n 資産がある。
- **採用したアプローチ**: help / error 等の CLI surface 文言は英語固定。`installFromSource` 内の進捗・警告メッセージは既存 `getMessages(lang)` を再利用する。
- **根拠**: CLI 文言の i18n は requirements 外であり、最小実装を優先（simplification）。
- **トレードオフ**: init 中だけ言語が混在しうる。将来の i18n 拡張は CLI 層に閉じて追加可能。

### 判断 9: global init の layout は `modern` 固定

- **背景**: `detectLayout()` は環境の `takt --version` を probe し非決定論を持ち込む。global init が書き込む devDependencies の takt は 0.43 系（≥0.22 = modern）。
- **採用したアプローチ**: global init は core へ `layout: "modern"` を常に渡し、`--layout` flag を公開しない。create-takt-sdd の `--layout` / auto 検出は無変更。
- **根拠**: 導入される takt version が modern を保証するため検出が不要。決定論（requirement 8 系）を優先。
- **トレードオフ**: legacy takt（<0.22）を使い続ける project は global init の対象外（create-takt-sdd を案内）。

## 統合（synthesis）の結果

- **一般化**: 「asset を staged root から導入する」操作を `installFromSource` に一般化し、remote / packaged は staging の差としてその外側に置いた。interface は一般化し、実装は現 requirements の 2 経路に限定した。
- **Build vs Adopt**: install policy・i18n・`npm pack --json`・`node:test` は既存資産/標準機能を採用。CLI argument parsing は installer の手書き parser パターンを踏襲し、外部 CLI framework は導入しない（依存ゼロ維持）。
- **単純化**: AssetSource クラス階層の排除（判断 2）、`--layout`/profile/toggle の非公開（判断 9）、catalog の静的配列化（判断 6）、config.yaml の read-only 化（判断 3 改訂。CLI 側の書き込み経路を全廃）。

## リスクと緩和策（設計フェーズ更新）

- `private: true` 解除により意図しない publish が可能になる — files allowlist + PackageArtifactValidator を CI 必須にし、publish 手順は後続 spec（automation は out of scope）まで手動 + `npm pack` 検証を前提にする。
- root devDependencies の全件 merge による開発依存の漏洩（latent bug） — allowlist 抽出関数への置き換えで構造的に遮断し、installer 既存 test に allowlist 検証を追加する。
- installer/dist 同梱忘れ・build 漏れ — `prepack` hook と global install smoke（PATH 経由実行）が二重に検出する。
- `npm install -g` smoke が registry へのアクセスを要する — 依存は exact pin で決定論を確保。real provider は不要（8.6 準拠）。registry 依存 step は smoke テストファイル 1 つに隔離し、`TAKT_SDD_SKIP_INSTALL_SMOKE=1` で明示 skip 可能（CI は常時実行）とする契約を design.md GlobalInstallSmoke に明文化済み。
- opsx-explore の実行モード差（判断 4） — README / README.ja に明記する。
