{extends: supervise}

# Kiro Implementation Validation Readiness

## Kiro 固有差分

この instruction は読み取り専用です。task completion と evidence を検証しますが、implementation task は実行せず、`tasks.md` checkbox も更新しません。

## Validation procedure

1. `.kiro/specs/<feature>/tasks.md` が存在することを確認する。
2. implementation validation の対象にする前に、`spec.json.ready_for_implementation` が true であることを確認する。
3. task checkbox state と blocked notes を確認する。
4. task completion と test/build evidence、報告された verification facts を比較する。
5. incomplete work、evidence mismatch、missing manual checks を分ける。
6. observed evidence と missing evidence を `evidence` と `findings` に分けて記録する。
7. evidence が不足する場合は、`category: "MANUAL_VERIFICATION_REQUIRED"` の finding を追加し、その項目を PASS evidence として扱わない。

## Output mapping

shared `kiro-validation-result` contract を使う。completed tasks と evidence が整合するときだけ `PASS` を返す。
