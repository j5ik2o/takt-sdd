{extends: supervise}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-validate-impl` または `/kiro-validate-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-validate-impl` または `/kiro-validate-impl` の `## Execution Steps` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Implementation Validation Readiness

## Kiro 固有差分

この instruction は読み取り専用です。task completion と evidence を検証しますが、implementation task は実行せず、`tasks.md` checkbox も更新しません。

## Validation procedure

1. `.kiro/specs/<feature>/tasks.md` が存在することを確認する。
2. implementation validation の対象にする前に、`spec.json.ready_for_implementation` が true であることを確認する。
3. `tasks.md` が不足する場合は、`error_category: ARTIFACT_MISSING` とともに `DECISION: NO-GO` を返す。
4. `ready_for_implementation` が false、または lifecycle state が implementation validation をブロックする場合は、`error_category: LIFECYCLE_INCONSISTENT` とともに `DECISION: NO-GO` を返す。
5. task checkbox state と blocked notes を確認する。
6. task completion と test/build evidence、報告された verification facts を比較する。
7. incomplete work、evidence mismatch、missing manual checks を分ける。
8. observed evidence と missing evidence を `evidence` と `findings` に分けて記録する。
9. evidence が不足する場合は、`DECISION: MANUAL_VERIFY_REQUIRED` を返し、`category: "MANUAL_VERIFICATION_REQUIRED"` の finding を追加し、その項目を verified evidence として扱わない。

## Output mapping

shared `kiro-validation-result` contract を使う。workflow routing 用の primary field として必ず `DECISION` を設定する。completed tasks と evidence が整合するときだけ `GO`、implementation validation が失敗した場合は `NO-GO`、evidence を自動確認できない場合は `MANUAL_VERIFY_REQUIRED` を返す。
