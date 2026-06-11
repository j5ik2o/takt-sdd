# 実装計画

- [ ] 1. 互換検証の事前整備
- [x] 1.1 検証フィクスチャの退役資産依存を除去する
  - LOOP_MONITOR_DRIFT 検証が cc-sdd-impl.yaml の raw content を素材に不正 kiro-impl fixture を構築している依存を、kiro-impl.yaml を素材とする構築へ差し替える
  - 観測可能な完了: 対象テストが退役予定資産を読まずに green である
  - _Requirements: 8.1_
  - _Boundary:_ SurfaceValidatorAlignment
  - _Depends:_ none

- [x] 1.2 互換検証の存在強制を撤去する
  - kiro workflow surface 検証から legacy 存在強制（cc-sdd:* scripts の存在・installer 伝播 scripts 内の cc-sdd:* 存在・README 移行表と opsx:full 記述の強制）を撤去する
  - kiro 純度検証（kiro scripts 集合の drift 検出・kiro workflow 内 cc-sdd- 文字列禁止・opsx:apply の非 kiro 判定）は無変更で維持する
  - CC-SDD-CLAUDE.md / CC-SDD-CODEX.md に対する既存の kiro 案内検証（kiro 記述の存在確認）は無変更で維持する（両ファイルは本スペックの境界外）
  - 退役物の不在強制はこの段階では追加しない（中間状態でも検証が green を保つ緩和。不在強制はタスク 7 が所有）
  - 観測可能な完了: 検証と対のテストが green で、退役資産・scripts が存在する現状態でも撤去後の検証が成功する
  - _Requirements: 8.2_
  - _Boundary:_ SurfaceValidatorAlignment
  - _Depends:_ none

- [x] 2. 公開 surface を縮小する（統合タスク）
  - `.takt/en/` と `.takt/ja/` から cc-sdd-*（10）/ opsx-*（5）workflow と退役専用 facet（en 59 + ja ミラー。言語ごとの参照解析で確定）を削除する
  - catalog を SUPPORTED kiro 12 / EXCLUDED internal のみ / RETIRED {legacy, opsx} へ再編し、isRetiredWorkflow を新設（isLegacyWorkflow を置換）、help から opsx を除去する
  - dispatch に系統別退役案内を実装する（cc-sdd: v2.0.0 退役済み / opsx: 退役済み・将来再提供予定。run 形式も同経路、spawn 不到達、exit 1）
  - artifact validator の catalog 消費を SUPPORTED ∪ internal に追従させ、OpenSpec / cc-sdd の version 整合検証を撤去する（不在強制はタスク 7）
  - drift 不変条件を「同梱資産 = SUPPORTED ∪ internal」「RETIRED 資産は非同梱」へ更新し、CLI 単体・artifact・smoke テストを退役後 surface に追従させる
  - 資産削除と catalog・検証更新は相互依存（どちらか先行で drift 検証が崩れる）のため明示の統合タスクとする
  - 観測可能な完了: 退役資産が repo に存在せず、cc-sdd-full / opsx-full（直接・run 形式とも）が案内付き exit 1 で停止し、CLI / artifact / smoke / installer の全テストと validate:all および validate:package-artifact が green である
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.4_
  - _Boundary:_ WorkflowAssetRetirement, CommandCatalog, CliMain, PackageArtifactValidator
  - _Depends:_ 1.2

- [x] 3. workflow 実行の preflight を takt のみへ縮小する
  - opsx 用の openspec binary 検査を削除し、宣言済み SDD 依存の binary 検査対象を takt のみとする
  - language 解決・strict 解決・takt 解決・引数組み立て・spawn は無変更であることをテストで確認する
  - タスク 2 と境界が重ならず並行可能だが、(P) 注釈は依存ありタスクに付与しない（repo の注釈契約）
  - 観測可能な完了: openspec 不足 fixture で preflight error が発生せず、takt 検査と既存挙動のテストが green である
  - _Requirements: 4.3_
  - _Boundary:_ WorkflowRunner
  - _Depends:_ 1.2

- [ ] 4. installer の init 退役と依存伝播の縮小を行う
  - 伝播 scripts を kiro:* のみへ縮小し、OpenSpec / cc-sdd の初期化（関数・定数・opsx-cli.sh 導入分岐）を物理削除する
  - 依存伝播 allowlist を takt のみへ縮小する（既存 merge 意味論=不足のみ追加・ユーザー既存物の維持と、install() → installFromSource の委譲構造は無変更）
  - init 統合テストの cc-sdd local 解決シーディングを撤去し、外部 process 不起動を固定する
  - openspec 依存宣言の削除（タスク 6）を本タスクより先に行うと、installFromSource の usesOfficialOpenSpec 分岐が opsx-cli.sh 不在の errorExit に到達する。タスク 6 の _Depends:_ 4 はこの破壊経路を防ぐ順序制約である
  - 観測可能な完了: fresh init で OpenSpec / cc-sdd が起動されず、対象 package.json への追加が kiro:* scripts と takt 依存のみで、installer / init 統合テストが green である
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Boundary:_ InstallCore
  - _Depends:_ 1.2

- [ ] 5. update 時の退役資産 cleanup を一般化する
  - 退役 manifest key パターンの静的定義と、hash 一致時のみ削除・不一致は警告 skip・空親ディレクトリ掃除の cleanup を、既存の opsx-cli.sh 個別削除前例を吸収する形で実装する
  - dry-run では削除予定一覧の表示のみ行い、削除・manifest 更新を行わない。fresh install（manifest なし）では発火しない
  - パターン外（openspec/ ディレクトリ・ユーザー追加物）に触れないことをテストで固定する
  - 観測可能な完了: v1.x 相当 fixture の update で未変更退役資産が削除され manifest 記録から消え、カスタマイズ済みは警告残置、dry-run は write ゼロで予定表示、ユーザー所有物が残ることの統合テストが green である
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Boundary:_ RetiredAssetCleanup
  - _Depends:_ 4

- [ ] 6. root package の scripts と依存宣言を退役する
  - cc-sdd:*（10）/ opsx:*（5）npm scripts を削除し、kiro:* scripts と files allowlist は無変更とする
  - OpenSpec / cc-sdd の依存宣言を削除し lockfile を同期する（root 依存は takt のみになる）
  - 退役 scripts のみが参照する補助 script が無いこと（takt.sh は kiro 実行経路の現役依存として維持）を確認する
  - installer の opsx-cli.sh / usesOfficialOpenSpec 分岐の除去（タスク 4）より後に行う（依存宣言の削除が v1 分岐の危険な中間状態を踏まないため）
  - 観測可能な完了: package.json に cc-sdd:* / opsx:* scripts と openspec / cc-sdd 依存が存在せず、npm install が冪等で、全テスト suite が green である
  - _Requirements: 3.1, 3.2, 3.3, 6.2_
  - _Boundary:_ RootPackageMetadata
  - _Depends:_ 4

- [ ] 7. 退役後検証を不在強制へ反転する（統合タスク）
  - surface 検証へ不在強制を追加する: root package.json / installer 伝播 scripts に cc-sdd:*・opsx:* が存在したら fail、配布資産に退役 workflow が存在したら fail（注入 negative case で固定）
  - artifact validator へ退役 workflow / 専用 facet の forbidden patterns と依存宣言不在の検証を追加し、catalog の RETIRED 集合 ↔ installer の cleanup パターンのクロスチェックを実装する
  - 観測可能な完了: 退役物を fixture 注入すると各検証が fail する negative case を含め、validate:all と validate:package-artifact と全テスト suite が green である
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2_
  - _Boundary:_ SurfaceValidatorAlignment, PackageArtifactValidator
  - _Depends:_ 2, 5, 6

- [ ] 8. ドキュメントを退役後 surface へ更新する
  - README / README.ja の Global CLI 節を kiro 12 のみへ更新し、cc-sdd-*（退役済み）と opsx-*（退役済み・将来再提供予定）、update 時の後始末挙動、project に残った旧 scripts の手動削除案内を日英で意味的に揃えて記載する
  - 導入手順から OpenSpec / cc-sdd の初期化・依存の記述を除去し、cc-sdd 移行表を npm scripts 互換終了の明記へ整理する。COMMON は command surface 整合の最小更新とする
  - 観測可能な完了: README / README.ja / COMMON に退役の記載があり、opsx を supported とする記述・OpenSpec / cc-sdd init の手順記述が存在しない
  - _Requirements: 8.3, 8.4_
  - _Boundary:_ Documentation
  - _Depends:_ 2, 6

- [ ] 9. breaking change を記録し release 判定を検証する
  - cc-sdd-* / opsx-* 退役と opsx 再提供方針を本文に含む breaking change コミット（feat! + BREAKING CHANGE footer）を作成する
  - release workflow の dry_run プレビューで次期 version が v2.0.0 と判定されることを確認し、その証跡を記録する
  - 観測可能な完了: dry_run の出力が major 繰り上がり（v2.0.0）を示し、changelog 本文に退役と再提供方針が含まれる
  - _Requirements: 7.1, 7.2, 7.3_
  - _Boundary:_ ReleaseBreakingRecord
  - _Depends:_ 7, 8

## Implementation Notes

- 2: 退役専用 facet の実数は en 70（workflow 68 + cc-sdd∧opsx のみ共有 2）/ ja 74（en ミラー + ja 固有 4 + 共有 2）。research.md の見積 59 は instructions 中心の概算だった。「未参照になった共有 facet」も要件 1.3 の削除対象（レビュー指摘で是正）
- 2: installer の SDD_SCRIPTS / OPENSPEC_* / CC_SDD_* はタスク 4 まで残存（中間状態として正。タスク 1.2 の緩和により検証は green を維持）
