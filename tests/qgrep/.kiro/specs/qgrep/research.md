# qgrep 発見ログ

## 1. 調査対象と前提
- 対象 feature: `qgrep`
- 要件ソース: `.kiro/specs/qgrep/requirements.md`
- ギャップ分析ソース: `.kiro/specs/qgrep/gap-analysis.md`
- 追加ステアリング: `.kiro/steering/` は未存在
- 適用ポリシー: `generate-design` 用ポリシーと知識を確認済み

## 2. 既存コードベース調査
### 2.1 現状ファイル構成
実装コード（`Cargo.toml`, `src/`, `tests/`）は未作成。現時点の主要資産は以下。
- `run-takt.sh`
- `test.sh`
- `test-requirement.sh`
- `test-design.sh`
- `test-validate-design.sh`
- `.kiro/specs/qgrep/requirements.md`
- `.kiro/specs/qgrep/gap-analysis.md`
- `.kiro/specs/qgrep/design.md`
- `.kiro/specs/qgrep/research.md`

要件9.1の観点で、Rustプロジェクト本体は新規作成が前提。

### 2.2 既存フローと統合ポイント
- `test.sh` は `sdd` ピース全体を起動するエントリ。
- `test-design.sh` は `sdd-design` を `feature=qgrep` で実行する設計フェーズ入口。
- `run-takt.sh` はTAKT実行ラッパーであり、設計成果物の正は `.kiro/specs/qgrep/` 配下。

## 3. 既存パターンの抽出
- このリポジトリは「実装コード中心」ではなく「仕様ドキュメント中心」の進行パターン。
- 設計成果物は `requirements.md` → `gap-analysis.md` → `design.md` → `research.md` の順で更新される。
- 既存実装流用はできないため、設計は新規機能向けの完全発見スコープとして扱う。

## 4. 技術調査（要件適合性）
要件に対して以下の技術要素が適合することを確認した。
- CLI引数解析: `clap`
- 正規表現: `regex`
- 再帰探索 + `.gitignore`: `ignore`
- 並列実行: `rayon`（要件6.2で必須）
- JSON Lines: `serde` + `serde_json`

外部API連携や認証統合は要件に含まれないため、外部サービス仕様の追加調査は不要。

## 5. NO-GO指摘への再調査と設計固定
前回の設計レビューで指摘された3点を再調査し、設計契約として固定した。

| 論点 | 再調査結果 | 固定した設計契約 |
|---|---|---|
| フィルタ一致規則（要件3） | 一致文法・比較基準が未定義だと実装差が出る | パスは `glob`、探索起点相対パス比較、大小文字区別、拡張子は `.` 除去 + 小文字正規化、exclude優先 |
| 実行エラー契約（要件8） | 継続可否とstderr契約が未定義だと運用再現性が下がる | `SearchIssue.kind` を分類し、kindごとに継続/中断を定義。stderrは `qgrep:error:path:kind:message` 形式で統一 |
| コンテキスト出力形式（要件5） | コンテキスト行フォーマット未定義でテスト期待値がぶれる | 一致行 `path:line:content`、コンテキスト行 `path-line-content`、非連続グループは `--`、近接重複行は1回のみ |

## 6. ギャップ分析の要調査項目の反映状況
| ID | 要調査項目 | 反映状況 | 設計反映先 |
|---|---|---|---|
| R1 | パス include/exclude 文法 | 反映済み | `TargetFilterPolicy` 契約 |
| R2 | 非UTF-8/バイナリ既定動作 | 一部反映（`TargetDecodeFailed` として継続処理） | `SearchIssue.kind`, `ExitCodePolicy` |
| R3 | 近接マッチ時のコンテキスト重複扱い | 反映済み（重複排除） | `ContextSlicePolicy` |
| R4 | 実行エラー収集単位と `stderr` 方針 | 反映済み | `SearchIssueList` 整列規則、stderr契約 |
| R5 | テスト分離方針 | 反映済み | ユニット/統合の役割分担 |

## 7. 設計リスクの再評価
### 7.1 仕様解釈リスク
- フィルタ文法とテキスト出力フォーマットを契約化したため、実装差分リスクは低減。
- 非UTF-8/バイナリの扱いは `TargetDecodeFailed` に寄せたが、完全な互換挙動定義は実装段階で最終確認が必要。

### 7.2 振る舞いリスク
- 並列実行結果の非決定性は `ResultOrderingPolicy` に集約して抑制可能。
- マッチ有無と実行エラー同時発生時の終了コード判定は `ExitCodePolicy` で一元管理する。

### 7.3 テストリスク
- 統合テストでフォーマット契約（コンテキスト行と `--`）を固定しないと再び曖昧化する。
- 並列検索テストは順序規則を前提に決定的な期待値へ落とし込む必要がある。

## 8. 設計への入力結論
- 推奨アプローチは **C: ハイブリッド**（新規実装 + 既存設計資産流用）。
- 工数/リスク見積は **M / Medium** を維持。
- 実装開始条件として、要件3/5/8に関する契約は設計文書へ反映済みと判断する。
