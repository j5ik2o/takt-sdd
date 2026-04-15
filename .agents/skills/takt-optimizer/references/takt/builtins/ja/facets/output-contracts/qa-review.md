```markdown
# QAレビュー

## 結果: APPROVE / REJECT

## サマリー
{1-2文で結果を要約}

## 確認した観点
| 観点 | 結果 | 備考 |
|------|------|------|
| テストカバレッジ | ✅ | - |
| テスト品質 | ✅ | - |
| エラーハンドリング | ✅ | - |
| ドキュメント | ✅ | - |
| 保守性 | ✅ | - |

## 今回の指摘（new）
| # | finding_id | family_tag | カテゴリ | 場所 | 問題 | 修正案 |
|---|------------|------------|---------|------|------|--------|
| 1 | QA-NEW-src-test-L42 | test-coverage | テスト | `src/test.ts:42` | 異常系テスト不足 | 失敗系ケースを追加 |

## 継続指摘（persists）
| # | finding_id | family_tag | 前回根拠 | 今回根拠 | 問題 | 修正案 |
|---|------------|------------|----------|----------|------|--------|
| 1 | QA-PERSIST-src-test-L77 | test-coverage | `src/test.ts:77` | `src/test.ts:77` | 不安定なまま | アサーションとセットアップを安定化 |

## 解消済み（resolved）
| finding_id | 解消根拠 |
|------------|----------|
| QA-RESOLVED-src-test-L10 | `src/test.ts:10` で異常系が網羅済み |

## 再開指摘（reopened）
| # | finding_id | family_tag | 解消根拠（前回） | 再発根拠 | 問題 | 修正案 |
|---|------------|------------|----------------|---------|------|--------|
| 1 | QA-REOPENED-src-test-L55 | test-coverage | `前回: src/test.ts:10 で修正済み` | `src/test.ts:55 で再発` | 問題の説明 | 修正方法 |

## REJECT判定条件
- `new`、`persists`、または `reopened` が1件以上ある場合のみ REJECT 可
- `finding_id` なしの指摘は無効
```
