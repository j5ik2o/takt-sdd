# Requirements Document

## Introduction

`takt-sdd-global-cli` は、takt-sdd を `npm install -g takt-sdd` で導入できる global CLI package として公開し、対象 project で `takt-sdd init .` と `takt-sdd kiro-*` / `takt-sdd opsx-*` workflow command を使えるようにする機能である。

現在の root package は `takt-sdd` という package 名を持つが `private: true` かつ `bin` entrypoint を持たないため、利用者は `create-takt-sdd` installer と導入先 project の npm scripts に依存している。この spec では `create-takt-sdd` の既存導線を維持しながら、root package の global CLI surface、init behavior、runtime command behavior、package artifact boundary、deterministic validation を定義する。

## Boundary Context

- **In scope（対象範囲）**: `takt-sdd` global command、`takt-sdd init <dir>`、`kiro-*` / `opsx-*` workflow command、packaged `.takt` asset source、既存 install policy の再利用、package artifact validation、deterministic global install validation。
- **Out of scope（対象外）**: `create-takt-sdd` の廃止、cc-sdd CLI 自体の変更、TAKT workflow/facet の意味的再設計、OpenSpec workflow の統合、`.takt/.manifest.json` schema 変更、install profile/toggle、TAKT git automation opt-in、npm publish automation、`.agents/skills/**` や Kiro spec generation rule の変更。
- **Adjacent expectations（隣接システム／スペックへの期待）**: `create-takt-sdd-fixed-cc-sdd` の installer behavior と manifest/update policy を壊さない。`kiro-workflow-surface` の `kiro:*` canonical surface と矛盾しない。旧 `cc-sdd:*` npm scripts/assets は互換用に残せるが、global CLI の supported command にはしない。

## Requirements

### Requirement 1: npm global command surface

**Objective:** As a takt-sdd 利用者, I want npm global install 後に `takt-sdd` command を使えること, so that repo-local npm scripts を知らなくても takt-sdd workflow を起動できる

#### Acceptance Criteria

1. 利用者が `npm install -g takt-sdd` で package を導入した場合、takt-sdd package は `takt-sdd` command を PATH から実行可能にするものとする。
2. 利用者が `takt-sdd --help` を実行した場合、takt-sdd CLI は `init`、supported `kiro-*` command、supported `opsx-*` command、`run <supported-workflow>` の利用可能な入口を表示するものとする。
3. 利用者が `takt-sdd --version` を実行した場合、takt-sdd CLI は installed package version を表示するものとする。
4. root package が公開 package として検証される場合、takt-sdd package は global command に必要な package metadata と runtime dependencies を公開 artifact に含めるものとする。

### Requirement 2: package 同梱 asset による init

**Objective:** As a takt-sdd 利用者, I want global package に同梱された assets から対象 project を初期化できること, so that global package version と導入される workflow/facet version を一致させられる

#### Acceptance Criteria

1. 利用者が `takt-sdd init <dir>` を実行した場合、takt-sdd CLI は対象 directory に package 同梱 `.takt` assets を導入するものとする。
2. `takt-sdd init <dir>` が実行された場合、takt-sdd CLI は GitHub release tag download を使わないものとする。
3. 利用者が `takt-sdd init <dir> --tag <value>` を指定した場合、takt-sdd CLI は `--tag` が global init では unsupported であることを明示して停止するものとする。
4. `takt-sdd init <dir>` が正常完了した場合、takt-sdd CLI は `npm install` を自動実行せず、次の手順として `npm install` が必要であることを案内するものとする。
5. 新規 project に `takt-sdd init <dir>` が実行され、`--lang` が明示されない場合、takt-sdd CLI は初期 language preference を `en` として扱うものとする。
6. `takt-sdd init <dir> --lang <lang>` が実行された場合、takt-sdd CLI は指定された language preference を導入または更新するものとする。
7. update 対象 project に既存 `.takt/config.yaml` が存在する間、takt-sdd CLI は `--lang` が明示されない限り既存 language preference を尊重するものとする。

### Requirement 3: 既存 installer policy の維持

**Objective:** As a メンテナー, I want `takt-sdd init` と `create-takt-sdd` が install policy drift を起こさないこと, so that manifest/update/customized skip の挙動を一貫して保てる

#### Acceptance Criteria

1. `takt-sdd init <dir>` が `.takt` assets を導入または更新する場合、takt-sdd CLI は既存 installer の manifest/update/customized file skip policy を維持するものとする。
2. `takt-sdd init <dir>` が既存 project を更新する場合、takt-sdd CLI は customized file を既定で上書きしないものとする。
3. 利用者が `--force` を指定した場合、takt-sdd CLI は既存 installer policy と同じ意味で上書き可能な対象を処理するものとする。
4. `takt-sdd init <dir> --dry-run` が実行された場合、takt-sdd CLI は実際の file write、OpenSpec 初期化、cc-sdd 初期化を行わず、予定される変更を表示するものとする。
5. `takt-sdd init` と `create-takt-sdd` が同じ対象状態と同じ option で asset update を行う場合、takt-sdd CLI は manifest、customized file skip、overwrite decision について同等の結果を返すものとする。

### Requirement 4: dependency と version policy

**Objective:** As a takt-sdd 利用者, I want init 後に Kiro/opsx/互換 npm scripts が必要な dependency を明確に持つこと, so that workflow 実行時の missing binary 事故を避けられる

#### Acceptance Criteria

1. `takt-sdd init <dir>` が package metadata を更新する場合、takt-sdd CLI は対象 project に `takt`、`@fission-ai/openspec@1.4.x`、`cc-sdd@3.x` の devDependencies を追加または維持するものとする。
2. init が dependency version を決定する場合、takt-sdd CLI は同じ global package version に対して一貫した dependency version を選ぶものとする。
3. init が dependency version を決定する場合、takt-sdd CLI は `latest` のような floating tag を実行時に解決しないものとする。
4. global `takt-sdd` workflow command が TAKT workflow を起動する場合、takt-sdd CLI は利用者に repo-local wrapper 設定を要求しないものとする。
5. `opsx-*` workflow command が実行され、対象 project に OpenSpec dependency が不足している場合、takt-sdd CLI は `npm install` を促す明示 error で停止するものとする。
6. 互換 npm scripts が維持される project で必要 dependency が不足している場合、takt-sdd CLI は不足 dependency を明示する error を返せるものとする。

### Requirement 5: supported workflow command と legacy rejection

**Objective:** As a takt-sdd 利用者, I want skill/workflow 名と対応する global command を迷わず実行できること, so that npm script 名や repo-local wrapper を知らなくても workflow を使える

#### Acceptance Criteria

1. 公開 command set に `kiro-*` 名の supported workflow が含まれる場合、takt-sdd CLI は対応する `takt-sdd kiro-*` command を提供するものとする。
2. 公開 command set に `opsx-*` 名の supported workflow が含まれる場合、takt-sdd CLI は対応する `takt-sdd opsx-*` command を提供するものとする。
3. supported workflow command が実行された場合、takt-sdd CLI は `--pipeline --skip-git` を TAKT invocation に付与するものとする。
4. 利用者が `takt-sdd cc-sdd-*` を実行した場合、takt-sdd CLI は legacy `cc-sdd-*` workflow が global CLI では unsupported であることを明示して停止するものとする。
5. 利用者が `takt-sdd run <workflow>` を実行した場合、takt-sdd CLI は `<workflow>` が公開 command set に含まれる supported workflow のときだけ実行するものとする。
6. 利用者が `takt-sdd run cc-sdd-*` を実行した場合、takt-sdd CLI は raw run 経由でも legacy `cc-sdd-*` workflow を拒否するものとする。
7. takt-sdd CLI は常に legacy `cc-sdd:*` npm scripts/assets を global CLI supported command として扱わないものとする。

### Requirement 6: 実行 context と preflight

**Objective:** As a takt-sdd 利用者, I want global package の実行 context と対象 project の artifacts が混線しない状態で workflow を実行できること, so that 誤った `.takt` や dependency を参照する事故を防げる

#### Acceptance Criteria

1. workflow command が実行された場合、takt-sdd CLI は現在の実行 directory を既定の対象 project root として扱うものとする。
2. 利用者が global `--cwd <dir>` を指定した場合、takt-sdd CLI は `<dir>` を対象 project root として扱うものとする。
3. workflow command が実行される場合、takt-sdd CLI は global package の実行資産と対象 project の artifacts を混線させないものとする。
4. workflow command が実行される場合、takt-sdd CLI は repo-local 開発用 wrapper や開発 checkout の存在を利用者に要求しないものとする。
5. 対象 project root に `.takt/config.yaml`、language-specific workflow/facet assets、または必要 dependency が不足している場合、takt-sdd CLI は自動修復せず `takt-sdd init .` または `npm install` を促して停止するものとする。
6. 対象 project root に `.takt/config.yaml` の language preference が存在する間、takt-sdd CLI は workflow resolution でその language preference を尊重するものとする。

### Requirement 7: package artifact boundary

**Objective:** As a メンテナー, I want npm package に runtime state や credential-like files を混入させず、必要な workflow/facet assets だけを配布すること, so that global install 後の package 内容を信頼できる

#### Acceptance Criteria

1. package artifact が作成される場合、takt-sdd package は必要な `.takt` workflow/facet assets と CLI runtime files を含めるものとする。
2. package artifact が作成される場合、takt-sdd package は `.takt/runs`、`.takt/session-state.json`、`.takt/persona_sessions.json`、logs、reports、provider credentials、開発専用生成物を package artifact に含めないものとする。
3. 互換 npm scripts が `cc-sdd-*` workflow/facet assets を参照する場合、takt-sdd package はそれらの assets を package artifact に含めることができるものとする。
4. package artifact validation が実行される場合、validation は期待される配布 file set と実際の package contents の整合を確認するものとする。
5. package artifact validation が実行される場合、validation は forbidden runtime state や provider credentials の混入を検出するものとする。

### Requirement 8: deterministic validation と documentation

**Objective:** As a メンテナー, I want global CLI の公開 surface と package boundary を CI で決定論的に検証すること, so that publish 前に `bin`、files、preflight、unsupported command の回帰を検出できる

#### Acceptance Criteria

1. deterministic validation が実行された場合、validation は package artifact を isolated install environment で導入し、PATH 経由の `takt-sdd` command を検証するものとする。
2. deterministic validation が実行された場合、validation は `takt-sdd --help` と `takt-sdd init . --dry-run` が実行可能であることを確認するものとする。
3. deterministic validation が実行された場合、validation は未初期化 project preflight が明示 error を返すことを確認するものとする。
4. deterministic validation が実行された場合、validation は `cc-sdd-*` command と `run cc-sdd-*` が拒否されることを確認するものとする。
5. deterministic validation が実行された場合、validation は package forbidden file exclusion を確認するものとする。
6. CI validation が実行される場合、validation suite は real provider smoke を必須条件にしないものとする。
7. documentation が更新される場合、documentation は `npm install -g takt-sdd`、`takt-sdd init .`、`npm install`、supported `kiro-*` / `opsx-*` command、`run <supported-workflow>`、legacy `cc-sdd-*` global CLI rejection を説明するものとする。
