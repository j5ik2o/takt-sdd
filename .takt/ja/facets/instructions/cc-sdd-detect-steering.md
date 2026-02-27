`.kiro/steering/` のステータスを確認し、実行モードを判定せよ。

**やること:**
1. `.kiro/steering/` ディレクトリの存在を確認する
2. コアファイル（`product.md`, `tech.md`, `structure.md`）の有無を確認する
3. 以下の基準でモードを判定する

**判定基準:**

| 条件 | モード |
|------|--------|
| ディレクトリが存在しない | Bootstrap |
| コアファイル（product.md, tech.md, structure.md）のいずれかが欠けている | Bootstrap |
| 全コアファイルが存在する | Sync |

**レポートに含める情報:**
- 検出されたモード（Bootstrap / Sync）
- 存在するsteeringファイルの一覧
- 欠けているコアファイルの一覧（Bootstrapの場合）
