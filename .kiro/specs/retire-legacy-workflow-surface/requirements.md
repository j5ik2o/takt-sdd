# 要件定義

## はじめに

`retire-legacy-workflow-surface` は、takt-sdd の配布 surface から legacy `cc-sdd-*` workflow と `opsx-*` workflow を退役させ、`kiro-*` workflow のみを公開 surface とする v2.0.0（major version）向けの機能である。

v1.x では `cc-sdd-*`（旧 CC-SDD 互換、npm scripts 経由のみ）と `opsx-*`（OpenSpec、npm scripts と global CLI の両方）が配布資産・npm scripts・依存伝播・init 内部初期化として残っている。本スペックはこれらを一括退役し、global CLI / npm scripts / package artifact / init policy を `kiro-*` 完結の最小構成に揃える。OpenSpec workflow の再提供は後続スペックが所有し、本スペックは退役のみを所有する。

## 境界コンテキスト

- **対象範囲**: `.takt/en/` と `.takt/ja/` の `cc-sdd-*`（10 種）・`opsx-*`（5 種）workflow 資産と退役 workflow 専用 prompt 資産の削除、root npm scripts（`cc-sdd:*` / `opsx:*`）の削除、global CLI の公開 command set 縮小と退役 command の案内付き拒否、init（takt-sdd init / create-takt-sdd）の OpenSpec 初期化・cc-sdd 初期化の停止と依存伝播の縮小、update 時の退役資産の後始末、package artifact 境界と検証の追従、major version release への記録、ドキュメント更新。
- **対象外**: OpenSpec workflow の再提供（後続スペック）、`.agents/skills/**`・`.claude/skills/**` の opsx / cc-sdd 系 agent skill とその資料、対象 project にユーザーが既に持つ `openspec/` ディレクトリや独自変更済みファイルの強制削除、npm publish の実行、release 自動化（release.yml）の仕組み自体の変更。
- **隣接システム／スペックへの期待**: `takt-sdd-global-cli` スペックが定義した公開 command catalog（kiro 12 + opsx 5）は本スペックにより kiro 12 のみへ置き換わる（同スペックの再検証トリガー「公開 command catalog の変更」に該当）。`kiro-workflow-surface` スペックが検証する互換 `cc-sdd:*` scripts の存在前提は本退役に合わせて更新される。`create-takt-sdd` は takt-sdd init と共有する install policy を通じて同じ退役を受け、両経路の結果同等性は維持される。

## 要件

### 要件 1: 配布 workflow 資産の退役

**目的:** メンテナーとして、v2.0.0 の配布資産を kiro-* に限定するために、cc-sdd-* と opsx-* の workflow 資産を配布物から退役させたい

#### 受け入れ基準

1. v2.0.0 の配布資産が構成される場合、takt-sdd package は `.takt/en/workflows/` と `.takt/ja/workflows/` のいずれにも `cc-sdd-*` workflow（10 種）を含めてはならない
2. v2.0.0 の配布資産が構成される場合、takt-sdd package は `.takt/en/workflows/` と `.takt/ja/workflows/` のいずれにも `opsx-*` workflow（5 種）を含めてはならない
3. 退役 workflow のみが参照していた prompt 資産（facet）が存在する場合、takt-sdd package はそれらを配布物から除外しなければならない
4. 退役後の配布資産が検証される場合、takt-sdd package は `kiro-*` workflow（12 種）と内部検証用 workflow（3 種）を en / ja の言語ペア構造を保ったまま含め続けなければならない
5. 退役 workflow と退役対象でない workflow が共有する prompt 資産が存在する場合、takt-sdd package はその共有資産を削除せず維持しなければならない

### 要件 2: global CLI command surface の縮小と退役案内

**目的:** takt-sdd 利用者として、退役後も迷わず操作できるために、公開 command を kiro-* のみとし退役 command には明示の案内を受けたい

#### 受け入れ基準

1. 利用者が `takt-sdd --help` を実行したとき、takt-sdd CLI は `init` と supported `kiro-*` command と `run <supported-workflow>` のみを公開 command として表示しなければならない
2. 利用者が `takt-sdd --help` を実行したとき、takt-sdd CLI は `cc-sdd-*` および `opsx-*` の command を公開 command として表示してはならない
3. 利用者が `takt-sdd cc-sdd-*` または `takt-sdd run cc-sdd-*` を実行した場合、takt-sdd CLI は cc-sdd-* workflow が v2.0.0 で退役済みであることを明示して非 0 終了で停止しなければならない
4. 利用者が `takt-sdd opsx-*` または `takt-sdd run opsx-*` を実行した場合、takt-sdd CLI は opsx-* workflow が退役済みであり将来の再提供が予定されていることを明示して非 0 終了で停止しなければならない
5. 退役 command の実行が拒否される場合、takt-sdd CLI は workflow 実行プロセスを起動してはならない
6. 利用者が退役 command にも公開 command にも該当しない command を実行した場合、takt-sdd CLI は従来どおり未知の command としてヘルプを案内しなければならない

### 要件 3: npm scripts surface の退役

**目的:** メンテナーとして、repo と導入先 project の scripts surface を kiro-* に揃えるために、cc-sdd:* / opsx:* npm scripts を退役させたい

#### 受け入れ基準

1. v2.0.0 の root package が検証される場合、takt-sdd package は `cc-sdd:*` および `opsx:*` の npm scripts を定義していてはならない
2. v2.0.0 の root package が検証される場合、takt-sdd package は既存の `kiro:*` npm scripts を意味を変えずに維持しなければならない
3. 退役 scripts のみが参照していた補助 script が存在する場合、takt-sdd package はそれらを配布物および導入対象から除外しなければならない
4. init が導入先 project へ scripts を提供する場合、takt-sdd CLI は `kiro:*` scripts のみを追加対象としなければならない

### 要件 4: init policy の退役（OpenSpec / cc-sdd 初期化と依存伝播）

**目的:** takt-sdd 利用者として、v2.0.0 の init を kiro-* 完結にするために、OpenSpec / cc-sdd の初期化と依存伝播を退役させたい

#### 受け入れ基準

1. `takt-sdd init <dir>` が実行されたとき、takt-sdd CLI は OpenSpec の初期化を実行してはならない
2. `takt-sdd init <dir>` が実行されたとき、takt-sdd CLI は cc-sdd の初期化を実行してはならない
3. init が導入先 project の依存を更新する場合、takt-sdd CLI は `takt` のみを SDD 依存として追加または維持しなければならない
4. init が導入先 project の依存を更新する場合、takt-sdd CLI は OpenSpec および cc-sdd の依存を新規に追加してはならない
5. `create-takt-sdd` が同じ対象状態と同じ option で実行された場合、create-takt-sdd は takt-sdd init と同等の退役後 policy（初期化停止・依存伝播縮小・scripts 縮小）で動作しなければならない
6. 導入先 project に利用者が独自に追加した scripts や依存が存在する間、init はそれらを削除せず維持し続けなければならない

### 要件 5: 既存導入 project の update 時の後始末

**目的:** 既存利用者として、v1.x で導入済みの project を v2.0.0 で update したときに、退役資産が安全に後始末されてほしい

#### 受け入れ基準

1. v1.x 導入済み project に対して update が実行され、退役 workflow 資産が導入時から変更されていない場合、init は当該資産を導入先から削除しなければならない
2. v1.x 導入済み project に対して update が実行され、退役 workflow 資産が利用者によって変更されている場合、init は当該資産を削除せず警告を表示しなければならない
3. update が dry-run で実行された場合、init は削除予定の退役資産を表示し、実際の削除を行ってはならない
4. update が退役資産を後始末する場合、init は導入記録（manifest）から当該資産の記録を除去しなければならない
5. update が実行された場合でも、init は導入先 project の `openspec/` ディレクトリおよびユーザー所有ファイルを削除してはならない

### 要件 6: package artifact と依存境界の追従

**目的:** メンテナーとして、v2.0.0 の公開 artifact を信頼できるものにするために、artifact 境界と依存境界を退役後の surface に追従させたい

#### 受け入れ基準

1. v2.0.0 の package artifact が作成される場合、takt-sdd package は退役 workflow 資産を artifact に含めてはならない
2. v2.0.0 の root package が検証される場合、takt-sdd package は OpenSpec および cc-sdd への依存宣言を持っていてはならない
3. package artifact validation が実行される場合、validation は退役 workflow 資産の混入を検出して失敗しなければならない
4. package artifact validation が実行される場合、validation は kiro-* surface に必要な資産一式（CLI 実行物・kiro workflow/facet 資産・install core・ドキュメント・ライセンス）の同梱を確認し続けなければならない

### 要件 7: major version release への記録

**目的:** メンテナーとして、互換性の破壊を SemVer として正しく公開するために、退役を major version release として記録したい

#### 受け入れ基準

1. 退役変更が main に取り込まれる場合、takt-sdd リポジトリは退役を breaking change として release 履歴の判定対象に記録しなければならない
2. 退役変更を含む次回 release が実行されたとき、release 成果物の version は major が繰り上がった値（v2.0.0）にならなければならない
3. release の変更履歴が生成される場合、変更履歴は cc-sdd-* / opsx-* workflow の退役と opsx の将来再提供方針を記載しなければならない

### 要件 8: 検証とドキュメントの追従

**目的:** メンテナーとして、退役後の surface を機械検証とドキュメントで一貫させるために、既存の検証群と利用手順を更新したい

#### 受け入れ基準

1. 退役後に repo の検証一式が実行された場合、検証一式は退役後の surface を前提として成功しなければならない
2. 互換 scripts の存在を前提とする既存検証が存在する場合、当該検証は退役後の前提に更新されなければならない
3. ドキュメントが更新される場合、ドキュメントは公開 command が kiro-* のみであること、cc-sdd-* / opsx-* が退役済みであること、opsx の将来再提供方針、および既存導入 project の update 時の後始末挙動を日英で意味的に揃えて記載しなければならない
4. ドキュメントが更新される場合、ドキュメントは OpenSpec / cc-sdd の初期化と依存伝播が行われなくなったことを導入手順から除去しなければならない
