# AIレビュー指示

## やらないこと
- ビルドやテストを伴うコマンドを実行しない。このステップはレビュー専用であり、検証実行は `implement` / `fix` 側の責務。

## やること
1. 対象ファイルの AI 生成コード特有の問題を確認する。
   - 幻覚 API
   - 存在しない import / パス
   - 過度な抽象化
   - 未使用コード
   - 指示外の後方互換追加
2. Previous Response から前回の open findings を抽出し、各 finding に `finding_id` を付与する
3. 各 finding を `new / persists / resolved` で判定する
4. ブロッキング問題が 1 件でもあれば `REJECT`、0 件なら `APPROVE` とする

## 必須出力
1. finding ごとに根拠を示す
2. 最終判定を `APPROVE` または `REJECT` で示す
3. `REJECT` の場合は、修正方針を file/line 付きで示す
