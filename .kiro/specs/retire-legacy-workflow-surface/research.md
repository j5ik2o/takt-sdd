# 調査・設計判断

## 要約
- **機能**: `retire-legacy-workflow-surface`
- **ディスカバリー範囲**: 拡張（既存システムの subtractive change、統合点中心の light discovery）
- **主要な発見**:
  - 退役対象 workflow（cc-sdd-* 10 + opsx-* 5）が参照する facet のうち、kiro-* / *-ai-quality-gate と共有されるものは **ゼロ**。en 側で cc-sdd 専用 41 + opsx 専用 16 + 両者のみ共有 2 = 59 ファイルが削除可能で、ja は en の完全ミラー
  - update 経路の sync は「source に存在しなくなったファイル」を削除しない（`syncRelativeFiles` は現 source の追加・更新のみ）。既存の明示削除前例は `removeLegacyOpsxScript` のみで、manifest hash 比較による customized skip・空ディレクトリ掃除・update 限定発火を備える
  - `scripts/takt.sh` は `scripts/kiro-staged.mjs:71` が参照する**現役の kiro:* 実行依存**であり、退役対象外（削除不可）。`scripts/opsx-cli.sh` は repo に存在しない（install 時の legacy 後始末対象としてのみ登場）
  - `scripts/validate-kiro-workflow-surface.mjs` は legacy の**存在を強制**する検証群（`legacyScripts` map・`validateLegacyDeprecationPolicy`・`validateInstalledLegacyScripts`・README 移行表と `opsx:full` 記述の必須化）を持ち、退役後は「不在の検証」へ反転が必要
  - `tests/kiro-iterative-implementation-workflow.test.mjs:148` が `.takt/ja/workflows/cc-sdd-impl.yaml` をフィクスチャとして読む（退役で破損 → kiro-impl.yaml 直読みへ差し替え）
  - cc-sdd init の退役により、`tests/takt-sdd-init-policy.test.mjs` の cc-sdd local 解決シーディング（network 回避策）が不要になり、init 統合テストは構造的に network-free になる

## 調査ログ

### 専用 facet と共有 facet の判別
- **背景**: 要件 1.3/1.5 — 退役 workflow 専用 facet は削除、共有 facet は維持
- **参照した情報源**: `.takt/en/workflows/*.yaml` の facet 参照を workflow 群ごとに抽出し集合差分（subagent 調査）
- **発見**: cc-sdd 専用 41、opsx 専用 16、cc-sdd∩opsx のみ共有 2（`instructions/ai-review-fix-loop-judge.md`, `instructions/batch-plan-implement-loop-judge.md`）。kiro / internal との共有 0。ja は同名ミラー
- **含意**: facet 削除は機械的に安全。削除後の参照整合は既存の `validate:all`（facet 参照検証）が回帰検出する

### update 時の退役資産 cleanup の実現方式
- **背景**: 要件 5 — v1.x 導入済み project の後始末
- **参照した情報源**: `installer/src/install.ts:314–356`（syncRelativeFiles）、`429–455, 663`（removeLegacyOpsxScript）
- **発見**: 汎用の「manifest にあるが source にない物の削除」は存在しない。`removeLegacyOpsxScript` が唯一の前例: (1) update 時のみ（manifest null で return）、(2) on-disk 存在 + manifest key 存在が前提、(3) hash 不一致（カスタマイズ済み）は警告 skip、(4) `rmSync` + 空親ディレクトリ掃除、(5) 新 manifest には自然に載らない
- **含意**: この前例を「退役 manifest key パターンの静的リスト」で一般化する。`scripts/opsx-cli.sh` も同リストの 1 entry として吸収し、bespoke 関数を置換する

### 退役名リストの配置と依存方向
- **背景**: CLI の退役案内（catalog 層）と installer の cleanup リストの両方が退役名を必要とする
- **参照した情報源**: takt-sdd-global-cli design の依存方向（installer は CLI 層を import 禁止、TypeScript/ESM 分離）
- **発見**: installer（TS→dist）は `cli/command-catalog.mjs` を import できない。リストは 2 箇所（catalog: 退役 command 判定・案内 / installer: 退役 manifest key cleanup）に分かれる
- **含意**: 二重定義のドリフトは検証層（scripts/tests は全層参照可）でクロスチェックする。`validate-package-artifact.mjs` または artifact test が「catalog の RETIRED 名 ↔ installer の cleanup パターン」の整合を固定する

### 互換検証（kiro-workflow-surface）の反転範囲
- **背景**: 要件 8.2 — 互換 scripts の存在前提検証の更新
- **参照した情報源**: `scripts/validate-kiro-workflow-surface.mjs:27–260`、`tests/kiro-workflow-surface.test.mjs:34–151`
- **発見**: legacy 存在強制は `legacyScripts`/`migrationPairs` map、`validateLegacyDeprecationPolicy`（cc-sdd:* scripts の存在 + 対応 workflow 起動の強制）、`validateInstalledLegacyScripts`（installer SDD_SCRIPTS 内の cc-sdd:* 強制）、`validateGuidanceText`/`validateMigrationDoc`（README 移行表 + `npm run opsx:full` 記述の強制）。kiro 純度検証（`KIRO_SCRIPT_SET_DRIFT`、kiro workflow 内 `cc-sdd-` 文字列禁止、`opsx:apply` の UNSUPPORTED_KIRO_IDENTITY）は退役後も有効
- **含意**: 「存在強制」を「不在強制」（package.json / installer SDD_SCRIPTS / 配布資産に cc-sdd:*・opsx:* が無いことを fail 条件にする）へ反転し、README 移行表の強制は削除。kiro 純度検証は無変更で維持

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク／制約 | メモ |
|--------|------|------|--------------|-------|
| A: 静的退役リスト + 既存前例の一般化（採用） | 退役名を catalog（CLI 案内用）と installer（cleanup 用）に静的定義し、removeLegacyOpsxScript を一般化 | 決定論的・既存パターン踏襲・diff 最小 | リスト二重定義 → 検証層でクロスチェック必須 | 既存の「検証スクリプト第一級」方針に整合 |
| B: manifest 差分による汎用 prune | manifest にあるが source にない全ファイルを削除 | リスト不要で将来も自動 | ユーザー追加ファイルや意図的残置の誤削除リスク、要件 5.5（ユーザー所有物不削除）との緊張 | 退役スコープを超える挙動変更のため不採用 |
| C: 退役資産を残置し案内のみ | 削除せず警告だけ | 最小実装 | 要件 5.1（未変更資産の削除）を満たさない | 不採用 |

## 設計判断

### 判断 1: 退役 workflow の CLI 分類は EXCLUDED から独立した RETIRED 分類にする
- catalog の `EXCLUDED_WORKFLOWS` は「同梱されるが公開しない」分類（internal が該当）。退役後の cc-sdd-*/opsx-* は**同梱されない**ため意味が異なる。`RETIRED_WORKFLOWS = { legacy: cc-sdd-* 10, opsx: opsx-* 5 }` を新設し、drift test の不変条件を「同梱資産 = SUPPORTED ∪ EXCLUDED.internal」かつ「RETIRED 資産は同梱されていない」に更新する

### 判断 2: 退役案内のメッセージ系統は 2 種類
- cc-sdd-*: 「v2.0.0 で退役済み」のみ（再提供予定なし）
- opsx-*: 「退役済み・将来の再提供を予定」（要件 2.4。後続スペックへの含み）
- いずれも spawn 前に停止（要件 2.5）。main.mjs の分類順は init → run 正規化 → RETIRED 判定 → catalog 照合 → unknown

### 判断 3: installer の退役は定数・関数の物理削除で行う
- `OPENSPEC_*`/`CC_SDD_*` 定数、`initializeOpenSpecProject`/`initializeCcSddProject`/`buildCcSddExecArgs`、opsx-cli.sh install block を削除し、`SDD_SCRIPTS` を kiro:* のみへ縮小、`resolveSddDependencySet` の allowlist を `["takt"]` へ縮小。フラグや分岐での温存はしない（v2 で完全退役、openspec 再提供は後続スペックが新規に設計する）

### 判断 4: 退役資産 cleanup は manifest key パターン駆動
- `RETIRED_MANIFEST_KEY_PATTERNS`（`.takt/workflows/cc-sdd-*.yaml`・`.takt/workflows/opsx-*.yaml`・facet の cc-sdd-*/opsx-* 名・`scripts/opsx-cli.sh`）に一致する manifest 記録済みファイルを、hash 一致時のみ削除・不一致は警告 skip・dry-run は表示のみ。fresh install（manifest なし）では発火しない

### 判断 5: takt.sh は維持、kiro-staged.mjs は無変更
- `scripts/takt.sh` は kiro:* の実行経路（kiro-staged.mjs）が参照する現役資産。退役対象は「cc-sdd:*/opsx:* scripts の定義」のみで、補助 script 自体は要件 3.3 の条件（退役 scripts のみが参照）に該当しない

### 判断 6: バージョン記録は専用 breaking commit で行う
- 実装コミット群とは独立した `feat!:` + `BREAKING CHANGE:` フッターのコミット（--allow-empty 可）を main 反映時に含め、`release.yml` の `workflow_dispatch`（dry_run: true）で v2.0.0 判定をプレビュー検証する（conventional-changelog-action / conventionalcommits preset の whatBump 規則は検証済み: breaking → major）

### 判断 7: steering の追従は本スペックの境界外
- `.kiro/steering/product.md`・`tech.md` の cc-sdd:*/opsx:* 記述は退役後に `/kiro-steering`（sync）で更新する。本スペックのドキュメント境界は README.md / README.ja.md / COMMON.md に限定する

## リスクと緩和
- **リスク**: 退役名リストの二重定義（catalog / installer）のドリフト → **緩和**: 検証層のクロスチェックを必須 file set 検証に組み込む
- **リスク**: 互換検証の反転漏れで CI が旧前提のまま fail/誤 pass → **緩和**: validate:all green を完了条件にし、反転後の negative case（cc-sdd:* を注入すると fail）をテストで固定
- **リスク**: update cleanup の誤削除 → **緩和**: hash 一致時のみ削除（カスタマイズ済みは警告 skip）、dry-run 表示、fresh install 非発火、ユーザー所有物（openspec/ 等）は対象パターン外
