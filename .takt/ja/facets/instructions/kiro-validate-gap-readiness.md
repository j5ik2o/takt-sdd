{extends: review-qa}

# Kiro Gap Validation Readiness

## Kiro 固有差分

この instruction は読み取り専用です。requirements と current codebase evidence を確認しますが、`.kiro/*` artifact は書きません。

## Validation procedure

1. `.kiro/specs/<feature>/requirements.md` が存在し、`spec.json` が requirements を検証できる phase に到達していることを確認する。
2. requirements が不足している場合は、`error_category: ARTIFACT_MISSING` または `LIFECYCLE_INCONSISTENT` とともに `verdict: FAIL` または `verdict: BLOCKED` を返す。
3. requirements と existing implementation evidence を比較する。
4. existing implementation、missing components、integration points、recommended next action を記録する。
5. observed evidence と missing evidence を `evidence` と `findings` に分けて記録する。
6. codebase evidence が不足する場合は、`category: "MANUAL_VERIFICATION_REQUIRED"` の finding を追加し、その項目を PASS evidence として扱わない。

## Output mapping

shared `kiro-validation-result` contract を使う。停止理由は `findings.message`、確認済み事実は `evidence` に入れる。
