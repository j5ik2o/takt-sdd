---
Full custom skill reason: common evidence helper shared by multiple validation skills, not a direct Kiro skill section adapter
---

{extends: gather-review}

# Kiro Validation Evidence Collection

## Kiro 固有差分

この instruction は読み取り専用です。repository state を変更せず、observed evidence と missing evidence を集めます。

## Evidence rules

1. 確認済み command result、inspected files、checked facts は `evidence` に入れる。
2. missing evidence は `evidence` ではなく `findings` に入れる。
3. 人間または external system による確認が必要な条件は、finding `category: "MANUAL_VERIFICATION_REQUIRED"` を使う。
4. missing evidence を `PASS` の根拠にしない。
5. `summary` は人間向け説明に限定し、workflow branching は machine fields を使う。

## Output mapping

shared `kiro-validation-result` contract fields の `verdict`、`checked_items`、`findings`、`error_category`、`evidence`、`summary` を使う。
