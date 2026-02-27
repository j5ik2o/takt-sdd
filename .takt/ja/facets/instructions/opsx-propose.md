新しいOpenSpec変更を作成し、必要なすべてのアーティファクトを一括で生成せよ。

**やること:**

1. タスクの説明から変更名を特定する
   - タスクにkebab-case名が含まれている場合、それをそのまま使用する
   - そうでない場合、説明からkebab-case名を導出する（例: 「ユーザー認証を追加」→ `add-user-auth`）

2. 変更ディレクトリを作成する
   ```bash
   bash scripts/opsx-cli.sh new change "<name>"
   ```
   これにより `openspec/changes/<name>/` に `.openspec.yaml` を含むスキャフォールドされた変更が作成される。

3. アーティファクトのビルド順序を取得する
   ```bash
   bash scripts/opsx-cli.sh status --change "<name>" --json
   ```
   JSONを解析して以下を取得する:
   - `applyRequires`: 実装前に必要なアーティファクトIDの配列
   - `artifacts`: すべてのアーティファクトのステータスと依存関係のリスト

4. apply可能になるまでアーティファクトを順序に沿って作成する

   依存順序でアーティファクトをループ（未解決の依存がないアーティファクトから順に）:

   a. `ready`（依存関係が満たされている）の各アーティファクトに対して:
      - 指示を取得する:
        ```bash
        bash scripts/opsx-cli.sh instructions <artifact-id> --change "<name>" --json
        ```
      - 指示JSONには以下が含まれる:
        - `context`: プロジェクトの背景（あなたへの制約 - 出力に含めないこと）
        - `rules`: アーティファクト固有のルール（あなたへの制約 - 出力に含めないこと）
        - `template`: 出力ファイルの構造
        - `instruction`: スキーマ固有のガイダンス
        - `outputPath`: アーティファクトの書き込み先
        - `dependencies`: コンテキスト用に読み込む完了済みアーティファクト
      - コンテキスト用に完了済みの依存アーティファクトを読み込む
      - `template`を構造として使用してアーティファクトファイルを作成する
      - `context`と`rules`は制約として適用するが、ファイルにコピーしない

   b. 各アーティファクト作成後、`bash scripts/opsx-cli.sh status --change "<name>" --json`を再実行する
      - `applyRequires`のすべてのアーティファクトIDがアーティファクト配列で`status: "done"`であるか確認する
      - すべての`applyRequires`アーティファクトが完了したら停止する

5. 最終ステータスを表示する
   ```bash
   bash scripts/opsx-cli.sh status --change "<name>"
   ```

**重要なルール:**

- 各アーティファクトタイプの`bash scripts/opsx-cli.sh instructions`からの`instruction`フィールドに従う
- `template`を出力ファイルの構造として使用する - そのセクションを埋める
- `context`と`rules`はあなたへの制約であり、ファイルの内容ではない
  - `<context>`、`<rules>`、`<project_context>`ブロックをアーティファクトにコピーしない
- 新しいアーティファクトを作成する前に依存アーティファクトを読み込む
- その名前の変更が既に存在する場合、報告してABORTする
- 次に進む前に各アーティファクトファイルが書き込み後に存在することを確認する
