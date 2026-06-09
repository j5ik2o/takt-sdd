# 実装計画

## タスク形式テンプレート

実行可能なすべてのタスク（every executable task / すべての executable task）に、この正規の注釈文法を用いること。

### 実行作業を含むメインタスク
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(このタスクの、観測可能な完了シグナルを具体的に記述する)*
  - _Requirements:_ {{REQUIREMENT_IDS}} *(IDのみ。説明や括弧を付けない)*
  - _Boundary:_ {{COMPONENT_NAMES}}
  - _Depends:_ {{TASK_IDS_OR_NONE}}

### メインタスクとサブタスク構造
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(このタスクの、観測可能な完了シグナルを具体的に記述する)*
  - _Requirements:_ {{REQUIREMENT_IDS}} *(IDのみ。説明や括弧を付けない)*
  - _Boundary:_ {{COMPONENT_NAMES}}
  - _Depends:_ {{TASK_IDS_OR_NONE}}

## 注釈ルール

- `_Requirements:_ {{REQUIREMENT_IDS}}` には数値の要件IDを用いる。
- `_Boundary:_ {{COMPONENT_NAMES}}` は、所有するコンポーネントまたはワークフローの境界を示す。
- `_Depends:_ {{TASK_IDS_OR_NONE}}` は、依存がある場合にタスクIDを用いる。
- 依存がない場合は `_Depends:_ none` が正規の文法。
- ` (P)` は、境界が重複せず、かつ明示的な依存グラフ上で独立実行可能と示される場合にのみ付与する。
