{extends: review-qa}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-validate-gap` または `/kiro-validate-gap` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-validate-gap` または `/kiro-validate-gap` の `## Core Task` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Gap Validation Readiness

## Kiro 固有差分

この instruction は読み取り専用です。requirements と current codebase evidence を確認しますが、`.kiro/*` artifact は書きません。

## Validation procedure

1. `.kiro/specs/<feature>/requirements.md` が存在し、`spec.json` が requirements を検証できる phase に到達していることを確認する。
2. requirements が不足している、または lifecycle が不整合な場合は、`error_category: ARTIFACT_MISSING` または `LIFECYCLE_INCONSISTENT` とともに `DECISION: NO-GO` を返す。
3. requirements と existing implementation evidence を比較する。
4. existing implementation、missing components、integration points、recommended next action を記録する。
5. observed evidence と missing evidence を `evidence` と `findings` に分けて記録する。
6. codebase evidence が不足する場合は、`DECISION: MANUAL_VERIFY_REQUIRED` を返し、`category: "MANUAL_VERIFICATION_REQUIRED"` の finding を追加し、その項目を verified evidence として扱わない。

## Output mapping

shared `kiro-validation-result` contract を使う。workflow routing 用の primary field として必ず `DECISION` を設定する。検証完了は `GO`、検証失敗は `NO-GO`、codebase evidence を自動確認できない場合は `MANUAL_VERIFY_REQUIRED` を返す。停止理由は `findings.message`、確認済み事実は `evidence` に入れる。
