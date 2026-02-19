# qfind リサーチログ（Iteration 2）

## 1. 調査対象と前提
- 対象 feature: `qfind`
- 発見スコープ: 新規機能（既存Rust実装なし）
- 主な参照:
  - `.kiro/specs/qfind/requirements.md`
  - `.kiro/specs/qfind/gap-analysis.md`
  - `.takt/.../context/policy/generate-design.2.20260219T111444Z.md`
  - `.takt/.../context/knowledge/generate-design.2.20260219T111444Z.md`
  - `.takt/.../context/previous_responses/validate-design.1.20260219T111444Z.md`

## 2. 既存コードベース調査

### 2.1 現状資産
- `src/` は空で、Rustの既存実装パターンは存在しない。
- `.kiro/steering/` は存在するがファイルは0件。
- 再利用可能コンポーネント（CLI解釈、走査、フィルタ、出力、テスト支援）は確認できない。

### 2.2 統合ポイント
- CLI入力: glob / regex / max-depth / json / root path
- 走査境界: ディレクトリ列挙、深度制限、権限エラー、`.gitignore` 剪定
- 判定境界: ファイル名パターン、内容パターン
- 出力境界: text/JSON、終了コード

## 3. validate-design 指摘の取り込み

### 指摘1: `.gitignore` の適用位置不整合
- 観測: 旧設計では走査後フィルタとして `.gitignore` を扱っていた。
- 影響: 要件3.1「探索対象から除外」と意味的にズレる。
- 設計反映: `.gitignore` は `ParallelPathScanner` 側の探索時剪定責務に移す。

### 指摘2: テスト関連の過剰コンポーネント化
- 観測: 旧設計では `UnitTestSuite` などを本番アーキ公開コンポーネントとして定義。
- 影響: 要件7に対して過剰な本番設計となり、実装面積を不必要に拡大。
- 設計反映: 要件7は「テスト戦略/テスト構成契約」で記述し、本番コンポーネントから除外。

### 指摘3: フィルタ契約の不統一
- 観測: `PathFilterPort.select(...)` と個別操作IFが併存し、順序保証が曖昧。
- 影響: 要件8.1/8.2の順序依存を実装で崩すリスク。
- 設計反映: `PathFilterPipelinePort.apply(...)` の単一契約に統合し、`SearchCoordinator` の単一路呼び出しに固定。

## 4. 技術リサーチ結果（設計入力）
- CLIパースは型安全な入力境界として扱う。
- 探索は `rayon` 前提で並列化しつつ、結果集合は決定的順序で扱う契約を持たせる。
- `.gitignore` の有無で探索対象制御を分岐する責務は走査層に置く。
- 出力は検索結果が確定してから text/JSON を選択する。

注記: 本フェーズは設計文書化のため、アルゴリズム詳細・コード例は扱わない。

## 5. リスクと設計上の対処
- リスク: 並列探索で結果順が揺らぐ。
  - 対処: `SearchResult` の不変条件として決定的順序を定義し、統合テストで複数回検証。
- リスク: `.gitignore` 非存在時に誤適用する。
  - 対処: 走査層で「存在時のみ適用」の分岐を明示し、ユニットで存在/非存在を固定検証。
- リスク: 受け入れ条件は満たすが責務分離が崩れる。
  - 対処: 単一責任のポート設計（入力/走査/フィルタ/出力）を維持。

## 6. 設計方針（最終）
- アーキテクチャは「Presentation / Application / Domain / Infrastructure」のハイブリッド。
- `.gitignore` は `PathScannerPort` 実装責務、glob/regex は `PathFilterPipelinePort` 実装責務。
- 検索フローは `SearchCoordinator` が単一路で実行する。
- 要件7は本番コンポーネントではなく、`tests/` と `cargo test` 契約で満たす。
