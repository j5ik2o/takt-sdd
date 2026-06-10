# 実装計画

- [ ] 1. shared install core の切り出しと version policy の確立
- [x] 1.1 install policy を asset source 非依存の共有経路として切り出す
  - 既存の manifest 管理・customized file skip・update 時 overwrite 判定・fresh install の force ガード・dry-run plan・scripts と devDependencies の merge・OpenSpec / cc-sdd init ordering の意味を変えずに、staged root と version を受け取る共有関数へ分離する
  - remote 固有処理（tar 検査・tag 解決・download・extract）を create-takt-sdd 側の staging に閉じ、staging 後は共有関数へ委譲する形に再編する
  - 委譲が行われること（policy の二重実装が存在しないこと）を installer の unit test で固定する
  - 観測可能な完了: 既存 installer test suite が無変更で green のまま、新設の委譲固定テストが pass する
  - _Requirements:_ 3.1, 3.2, 3.3, 3.4, 3.5
  - _Boundary:_ InstallCore
  - _Depends:_ none

- [ ] 1.2 対象 project へ伝播する SDD dependency set を allowlist 方式へ置き換える
  - devDependencies 全件 merge を廃止し、takt / OpenSpec / cc-sdd の 3 つに限定した allowlist 抽出（dependencies ∪ devDependencies）に置き換える
  - OpenSpec の内部起動用定数を 1.4.1 に整合させ、cc-sdd は既存の pinned npm exec 経路を維持する
  - 実行時に latest 等の floating 解決を行わないことを fixture ベースの unit test で固定する（root package.json への依存はこのタスクでは持たない。定数と root package.json の整合検証は 5.1 が所有する）
  - 共有 install core と同一 module を編集するため 1.1 と並行実行不可
  - 観測可能な完了: fixture package.json に対する allowlist 抽出テストと OpenSpec 定数のテストが pass し、開発専用依存が抽出結果に現れない
  - _Requirements:_ 4.1, 4.2, 4.3
  - _Boundary:_ VersionPolicy
  - _Depends:_ 1.1

- [ ] 2. (P) 公開 package 境界と build chain の確立
  - root package を公開可能にする（private 解除、command 入口の宣言、license / engines / repository の整備）
  - 配布物の allowlist を定義し、workflow/facet 資産・CLI 実行物・compiled install core を含め、runtime state・credentials・開発専用物を構造的に除外する
  - runtime 依存（takt / OpenSpec）を exact pin で dependencies に再編し、cc-sdd 3.0.2 を devDependencies に追加する
  - installer build の単一入口 script（build:installer）を定義し、pack 前 hook と新規 test scripts 群が build:installer を前置する形で定義する（installer 依存導入込み）
  - installer 側の module には触れない（package.json のみ編集）。version 定数と root package.json の整合検証は 5.1 が所有するため、task 1 と並行実行できる
  - 観測可能な完了: npm pkg の読み出しで bin / files / dependencies / engines / private=false が期待値どおりであり、build:installer の実行で compiled install core（installer/dist 配下の実行物）が実際に生成され、新規 test scripts の定義が build:installer を前置している
  - _Requirements:_ 1.1, 1.4, 4.2, 7.1, 7.2, 7.3
  - _Boundary:_ RootPackageMetadata
  - _Depends:_ none

- [ ] 3. CLI command surface の実装
- [ ] 3.1 (P) 公開 command catalog と除外分類を定義する
  - supported workflow（kiro 12 + opsx 5）の静的 catalog と、legacy / internal の除外分類を単一 module に定義する
  - help text 生成（init・kiro-*・opsx-*・run・global options の列挙）を catalog から導出する
  - 双方向 drift test を作成: catalog 全 entry に en/ja 両資産が存在し、同梱 workflow 資産の全数が catalog または除外分類に属し、未分類資産があれば fail する
  - 観測可能な完了: 双方向 drift test が pass し、cc-sdd prefix の entry が catalog に存在しないことが test で固定される
  - _Requirements:_ 1.2, 5.1, 5.2, 5.7
  - _Boundary:_ CommandCatalog
  - _Depends:_ none

- [ ] 3.2 (P) packaged asset source による init command を実装する
  - --tag を明示 error で拒否し、対象 directory positional・--lang・--force・--dry-run を解析する
  - language 解決の優先順位（明示 flag > 既存 config の preference の read-only 参照 > manifest の lang > en）を実装する
  - packageRoot を asset root として共有 install core を呼び出し（layout は modern 固定）、GitHub download への code path を持たない
  - config.yaml はユーザー所有として読み取りのみとし、作成・変更しない（language の記録は manifest に委ねる）。既存 config の language と導入言語の不一致時は警告のみ表示する
  - npm install を自動実行せず次手順として案内する
  - 観測可能な完了: fixture 対象への init 統合テスト（fresh init の manifest 生成・customized skip・force・dry-run write ゼロ・--tag 拒否・lang 優先順位の 4 段階（flag > config > manifest > default）の独立検証・config.yaml が作成も変更もされないこと）が pass する
  - _Requirements:_ 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4
  - _Boundary:_ InitAdapter
  - _Depends:_ 1.1, 1.2

- [ ] 3.3 (P) workflow 実行の preflight と spawn を実装する
  - preflight を spawn 前に完結させる: workflow 資産の strict 解決不能（未初期化含む）は init 案内、opsx での project-local openspec binary 不足は npm install 案内、宣言済み SDD 依存の binary 不足一覧の明示
  - language は config の preference（存在時のみ read-only 参照）> manifest の lang > en で確定し、config 不在は error にしない
  - workflow 解決は言語間 fallback なしの strict 2 候補方式とする
  - takt 実行体は packageRoot 側 dependency から決定論的に解決し、repo-local wrapper・PATH・projectRoot 側 takt を参照しない
  - 引数組み立てで --pipeline --skip-git を常時付与し、positional を task 引数へ、flag を forward する
  - spawn は projectRoot を作業 directory とし、exit code を伝播する
  - 3.1 が作成する CLI unit test file へテストを追記するため 3.1 完了後に開始する（3.2 とは並行可能）
  - 観測可能な完了: mock spawn による unit test（preflight 失敗各 case で spawn 不到達、config 不在でも manifest lang で実行可能、引数列への --pipeline --skip-git 包含、ja 設定での ja 資産解決と fallback 非実施）が pass する
  - _Requirements:_ 4.4, 4.5, 4.6, 5.3, 6.3, 6.4, 6.5, 6.6
  - _Boundary:_ WorkflowRunner
  - _Depends:_ 3.1

- [ ] 4. CLI dispatch と bin entry の統合
  - global options（--cwd / --help / --version）の解析と projectRoot / packageRoot context の構築
  - command 分類（init → run 正規化 → catalog 照合 → legacy 拒否 → unknown 案内）と各 adapter への dispatch
  - run 形式を直接 command と同一経路に正規化し、catalog 外と legacy を実行前に拒否する
  - typed error の捕捉と exit code 変換、compiled install core 不在時の build 案内 error（開発 checkout 向け）
  - shebang 付き bin entry を追加し dispatch へ委譲する
  - 観測可能な完了: 開発 checkout で bin entry 経由の --help が catalog を表示し、--version が package version を出力し、cc-sdd-full と run cc-sdd-full が非 0 exit + unsupported message で停止する（dispatch 単体テスト pass を含む）
  - _Requirements:_ 1.1, 1.2, 1.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3
  - _Boundary:_ CliMain, GlobalCliEntry
  - _Depends:_ 3.1, 3.2, 3.3

- [ ] 5. deterministic validation と CI 統合
- [ ] 5.1 (P) package artifact validator を実装する
  - npm pack の dry-run JSON 出力を必須 file set（bin / cli / 言語別 workflow・facet 資産 / kiro-staged script / compiled install core / docs / license）と照合する
  - forbidden patterns（repo config・runs・session state・persona sessions・logs・credentials 系・開発専用物・test 混入）を検出する
  - version 定数と root package.json の整合（OpenSpec 1.4.1 / cc-sdd 3.0.2 / takt exact pin）を検証に含める
  - 観測可能な完了: validator script と対の test が green であり、forbidden file が files に混入した場合に fail する negative case が test 内で確認される
  - _Requirements:_ 7.1, 7.2, 7.4, 7.5, 8.5
  - _Boundary:_ PackageArtifactValidator
  - _Depends:_ 2, 4

- [ ] 5.2 (P) isolated global install smoke を実装する
  - tarball を temp npm prefix へ global install し、PATH 経由で command surface を検証する（--help / --version / init dry-run / 未初期化 preflight error / cc-sdd 拒否・run cc-sdd 拒否）
  - tarball contents の forbidden file 二重確認を含める
  - registry 依存をこの test file 1 つに隔離し、skip 環境変数による明示 skip（理由出力付き）を実装する
  - 観測可能な完了: smoke test が green で、skip 変数設定時に skip 理由が出力され、init dry-run が対象 directory への write ゼロで完了する
  - _Requirements:_ 1.1, 1.3, 8.1, 8.2, 8.3, 8.4, 8.5
  - _Boundary:_ GlobalInstallSmoke
  - _Depends:_ 2, 4

- [ ] 5.3 CI に global-cli job を追加する
  - installer build → CLI unit/統合 test → artifact validator → install smoke の順で実行する job を既存 CI に追加する（skip 変数は設定しない）
  - real provider credential を要求する step を含めない
  - 観測可能な完了: job 相当の step 列がローカルで成功し、workflow YAML が構文検証を通る
  - _Requirements:_ 8.6
  - _Boundary:_ CiIntegration
  - _Depends:_ 5.1, 5.2

- [ ] 6. (P) global CLI documentation の更新
  - 導入手順（global install → init → npm install）、supported command 一覧、run 形式、--cwd / --lang / --force / --dry-run、legacy cc-sdd の global CLI 拒否、opsx-explore の実行モード差、config.yaml がユーザー所有（global または project）であり CLI が書き込まないことを日英で意味的に揃えて記述する
  - 観測可能な完了: README / README.ja / COMMON に global CLI 節が存在し、上記項目がすべて記載されている
  - _Requirements:_ 8.7
  - _Boundary:_ Documentation
  - _Depends:_ 4
