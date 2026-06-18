# 要件定義

## はじめに
takt-sdd の利用者とメンテナーは、バージョンアップのたびにプロジェクトへコピー済みの `.takt/workflows` と `.takt/facets` を更新・同期する必要があり、カスタマイズ済みファイルと upstream の更新差分を判定する負担を抱えている。現在の `takt-sdd init` と `create-takt-sdd` は bundled workflow/facet assets を各プロジェクトへコピーし、manifest や package.json scripts、project-local helper script も扱うため、asset 配布と project-owned customization の境界が曖昧になっている。

この変更では、takt-sdd の通常実行を「コピー不要」に切り替える。`takt-sdd` はデフォルトでインストール済み package 内の bundled workflows/facets を直接解決し、project-local workflow は明示的な override としてだけ扱う。project-local `.takt/workflows/<name>.yaml` と `.takt/<lang>/workflows/<name>.yaml` は既存互換のため引き続き優先し、存在しない場合は package 側 `.takt/<lang>/workflows/<name>.yaml` に fallback する。facet は選択された workflow path からの相対参照として解決し、package workflow は package facets、project workflow は project facets を使う。package workflow と project facets の暗黙混在は許可しない。

`takt-sdd init` は廃止済みコマンドとしてしばらく残すが、コピー、manifest 作成、package.json 変更、script コピーなどの書き込みは一切行わない。`takt-sdd init --help` と `-h` は exit 0 で deprecated help を表示し、それ以外の `init` 呼び出しは旧オプションを検証せず、廃止案内と `takt-sdd eject` への移行案内を表示して exit 1 にする。

カスタマイズが必要な利用者向けに `takt-sdd eject` を追加する。`eject` は bundled `.takt/<lang>/workflows/**/*` と `.takt/<lang>/facets/**/*` だけを project にコピーする唯一の入口であり、`scripts/kiro-staged.mjs`、`package.json`、`.takt/config.yaml`、`.takt/.manifest.json` は作成・変更しない。デフォルトでは解決済み language だけを eject し、`--lang en|ja`、`--all-languages`、`--dry-run`、`--force` をサポートする。`--lang` と `--all-languages` は同時指定不可とする。eject は事前に copy plan を作り、partial write を避ける。target が存在しない場合は追加し、同一内容なら no-op、異なる内容なら collision として `--force` なしでは何も書かず exit 1、`--force` ありでは上書きする。extra project files や package から削除された旧 ejected files は prune しない。

`create-takt-sdd` も新規導線から外し、当面 package publish は続けるが実行時は retired guidance のみを行う。通常呼び出しは書き込みを行わず、`takt-sdd` を直接使うことと customization には `takt-sdd eject` を使うことを案内して exit 1 にする。`create-takt-sdd --help` と `-h` は exit 0 で retired help を表示する。

実行時 preflight は project-local `.takt/`、manifest、project-local `takt` dependency を必須にしない。`takt-sdd` は常に packageRoot 側の `takt` dependency を使う。language は `.takt/config.yaml` の `language` を最優先し、既存互換の read-only fallback として `.takt/.manifest.json` の `lang` を読み、どちらもなければ `en` を使う。manifest は新規作成・更新しない。既存の package.json scripts や project-local `scripts/kiro-staged.mjs` は自動編集・削除しない。

この変更は major version を上げずに行うが、CHANGELOG と README には明確な BREAKING BEHAVIOR CHANGE として migration を記録する。`takt-sdd init` による asset copy を前提にした手順は廃止され、通常利用は `takt-sdd kiro-*`、カスタマイズは `takt-sdd eject` に一本化される。

## 境界コンテキスト（任意）
- **対象範囲**: `takt-sdd` の workflow 実行時 asset 解決、`init` 廃止案内、`eject` による workflow/facet export、`create-takt-sdd` の retired guidance、関連 README / CHANGELOG migration。
- **対象外**: workflow 単位の部分 eject、facet 単体 override、project package.json scripts の自動追加・削除、project-local `scripts/kiro-staged.mjs` の自動削除、`.takt/config.yaml` の作成・変更、manifest の新規作成・更新、ejected files の prune、npm package deprecate 操作、major version bump。
- **隣接システム／スペックへの期待**: TAKT は選択された workflow path からの相対参照として facets を解決する。既存の `kiro-*` workflow catalog と retired workflow rejection は維持される。既存 project-local workflow は project-owned override として扱われる。

## 要件

### 要件 1: コピー不要の bundled workflow 実行
**目的:** takt-sdd 利用者として、バージョンアップ時に project-local asset 同期を不要にするために、コピーなしで bundled workflow を実行できるようにしたい

#### 受け入れ基準
1. 利用者が supported `kiro-*` workflow を実行し、project-local workflow が存在しない場合、takt-sdd は選択された language の package bundled workflow を解決しなければならない
2. project `.takt/workflows/<name>.yaml` が存在する場合、takt-sdd は legacy root override としてその workflow を package bundled workflow より優先しなければならない
3. project `.takt/<lang>/workflows/<name>.yaml` が存在し、legacy root override が存在しない場合、takt-sdd は language-specific project override としてその workflow を package bundled workflow より優先しなければならない
4. project-local workflow が存在しない場合、takt-sdd は project `.takt/` が存在しない状態でも package bundled workflow を実行できなければならない
5. package bundled workflow が選択された場合、takt-sdd は project-local facet-only files によって package workflow の挙動を変更してはならない
6. project-local workflow が選択された場合、takt-sdd はその workflow が参照する project-local facets が不足しているエラーを package facets への暗黙 fallback で隠してはならない

### 要件 2: language 解決と preflight の簡素化
**目的:** takt-sdd 利用者として、init や project-local dependencies に依存せずに workflow を実行するために、language と実行前提が package 実行モデルに合っていてほしい

#### 受け入れ基準
1. project `.takt/config.yaml` に `language: en` または `language: ja` が存在する場合、takt-sdd はその language を最優先で使用しなければならない
2. project `.takt/config.yaml` に有効な language がなく、既存 `.takt/.manifest.json` に `lang: en` または `lang: ja` が存在する場合、takt-sdd は legacy fallback としてその language を使用しなければならない
3. project `.takt/config.yaml` と `.takt/.manifest.json` のどちらからも language を解決できない場合、takt-sdd は常に `en` を使用しなければならない
4. project package.json に `takt` dependency が存在し、project-local `node_modules/.bin/takt` が存在しない場合、takt-sdd はその理由だけで workflow 実行を拒否してはならない
5. supported workflow を実行する間、takt-sdd は常に installed takt-sdd package に同梱された `takt` dependency を使用しなければならない
6. 選択された language で project override も package bundled workflow も見つからない場合、takt-sdd は `init` 実行を求めず、workflow と language を特定できるエラーを表示しなければならない

### 要件 3: `takt-sdd init` の廃止案内
**目的:** 既存利用者として、古い `init` 導線を実行したときに安全に新導線へ移行するために、書き込みを伴わない明確な廃止案内が欲しい

#### 受け入れ基準
1. 利用者が `takt-sdd init --help` または `takt-sdd init -h` を実行したとき、takt-sdd は deprecated help を表示し、exit code 0 で終了しなければならない
2. 利用者が `takt-sdd init` を help 以外の引数で実行したとき、takt-sdd は retired guidance を表示し、exit code 1 で終了しなければならない
3. help 以外の `init` 呼び出しの場合、takt-sdd は `.takt/` assets、`.takt/.manifest.json`、`scripts/kiro-staged.mjs`、package.json を作成または変更してはならない
4. help 以外の `init` 呼び出しに旧 `--force`、`--lang`、`--dry-run`、target directory が含まれる場合、takt-sdd は旧オプションの妥当性検証よりも廃止案内を優先しなければならない
5. `init` の廃止案内を表示する場合、takt-sdd は bundled workflows/facets が installed package から直接使われることと、カスタマイズには `takt-sdd eject` を使うことを示さなければならない

### 要件 4: `takt-sdd eject` の command surface
**目的:** workflow/facet をカスタマイズしたい利用者として、明示的な操作で bundled assets を project-owned files として取り出したい

#### 受け入れ基準
1. 利用者が `takt-sdd eject --help` または `takt-sdd eject -h` を実行したとき、takt-sdd は eject の usage と options を表示し、exit code 0 で終了しなければならない
2. 利用者が language option なしで `takt-sdd eject` を実行した場合、takt-sdd は解決済み language の workflows/facets だけを eject 対象にしなければならない
3. 利用者が `takt-sdd eject --lang en` または `--lang ja` を実行した場合、takt-sdd は指定 language の workflows/facets だけを eject 対象にしなければならない
4. 利用者が `takt-sdd eject --all-languages` を実行した場合、takt-sdd は `en` と `ja` の workflows/facets を eject 対象にしなければならない
5. `--lang` と `--all-languages` が同時に指定された場合、takt-sdd は何も書き込まず、競合する options を示すエラーで終了しなければならない
6. eject を実行する場合、takt-sdd は `.takt/<lang>/workflows/**/*` と `.takt/<lang>/facets/**/*` だけを copy plan に含めなければならない
7. eject を実行する場合、takt-sdd は `.takt/config.yaml`、`.takt/.manifest.json`、`scripts/kiro-staged.mjs`、package.json を copy plan に含めてはならない

### 要件 5: `takt-sdd eject` の安全な書き込み
**目的:** workflow/facet をカスタマイズしたい利用者として、既存 project-owned files を誤って壊さずに eject したい

#### 受け入れ基準
1. eject 対象の target file が存在しない場合、takt-sdd はその file を作成対象として扱わなければならない
2. eject 対象の target file が存在し、source と同一内容の場合、takt-sdd はその file を no-op として扱い、collision として扱ってはならない
3. eject 対象の target file が存在し、source と異なる内容の場合、takt-sdd はその file を collision として扱わなければならない
4. collision が存在し、`--force` が指定されていない場合、takt-sdd は対象 file を一切書き込まず、collision list を表示して exit code 1 で終了しなければならない
5. collision が存在し、`--force` が指定されている場合、takt-sdd は異なる内容の target file を bundled source で上書きしなければならない
6. `--dry-run` が指定された場合、takt-sdd は copy plan、no-op、collision、overwrite 予定を表示し、file を作成または変更してはならない
7. `--dry-run` が指定され、collision が存在し、`--force` が指定されていない場合、takt-sdd は collision list を表示して exit code 1 で終了しなければならない
8. `--dry-run --force` が指定された場合、takt-sdd は overwrite 予定を表示し、file を作成または変更せず、exit code 0 で終了しなければならない
9. eject が成功した場合、takt-sdd は copied、skipped、overwritten の結果と、ejected files が project-owned で自動更新されないことを表示しなければならない
10. eject が成功した場合、takt-sdd は `.takt/config.yaml` を作成または変更しないことを表示しなければならない
11. `ja` だけを eject し、`.takt/config.yaml` に `language: ja` がない場合、takt-sdd は `language: ja` をユーザーが自分で設定する必要があることを表示しなければならない
12. eject を実行する間、takt-sdd は package から削除された旧 ejected files や extra project files を削除してはならない

### 要件 6: `create-takt-sdd` の廃止案内
**目的:** 既存の `npx create-takt-sdd` 利用者として、古い initializer を実行したときに安全に新しい `takt-sdd` 導線へ移行したい

#### 受け入れ基準
1. 利用者が `create-takt-sdd --help` または `create-takt-sdd -h` を実行したとき、create-takt-sdd は retired help を表示し、exit code 0 で終了しなければならない
2. 利用者が help 以外で `create-takt-sdd` を実行したとき、create-takt-sdd は retired guidance を表示し、exit code 1 で終了しなければならない
3. help 以外の `create-takt-sdd` 呼び出しの場合、create-takt-sdd は `.takt/` assets、manifest、scripts、package.json を作成または変更してはならない
4. `create-takt-sdd` が retired guidance を表示する場合、create-takt-sdd は `takt-sdd` を直接使うことと、カスタマイズには `takt-sdd eject` を使うことを示さなければならない
5. create-takt-sdd package が公開される場合、公開された package は旧 asset copy 動作に戻ってはならない

### 要件 7: 既存 project-owned files の非破壊移行
**目的:** 既存 project の利用者として、コピー廃止への移行時に project-owned customization や scripts を勝手に変更されないようにしたい

#### 受け入れ基準
1. supported workflow を実行する場合、takt-sdd は既存 project-local workflow を project-owned override として扱い続けなければならない
2. supported workflow を実行する場合、project-local facets だけが存在して project-local workflow が存在しないとき、takt-sdd はそれらの facets を package bundled workflow に暗黙適用してはならない
3. 既存 package.json に `kiro:*` scripts が存在する場合、takt-sdd はそれらの scripts を自動変更または削除してはならない
4. 既存 `scripts/kiro-staged.mjs` が存在する場合、takt-sdd はその file を自動変更または削除してはならない
5. 既存 `.takt/.manifest.json` が存在する場合、takt-sdd は language fallback として読み取る以外の目的でその file を作成、更新、削除してはならない

### 要件 8: ドキュメントと migration の明示
**目的:** takt-sdd 利用者とメンテナーとして、major version を上げない破壊的挙動変更を誤解なく移行できるようにしたい

#### 受け入れ基準
1. CHANGELOG が更新される場合、takt-sdd は `init` asset copy 廃止を BREAKING BEHAVIOR CHANGE として明示しなければならない
2. README が更新される場合、takt-sdd は通常実行が package bundled workflows/facets を直接使うことを説明しなければならない
3. README が更新される場合、takt-sdd はカスタマイズが必要な場合に `takt-sdd eject` を使うことを説明しなければならない
4. README が更新される場合、takt-sdd は `takt-sdd init` と `create-takt-sdd` が retired guidance のみになることを説明しなければならない
5. README が更新される場合、takt-sdd は npm scripts を使いたい利用者向けに手動で `takt-sdd kiro-*` を呼ぶ script 例を示さなければならない
6. migration guidance を表示または文書化する場合、takt-sdd は major version を上げないことと、破壊的挙動変更であることを隠してはならない
