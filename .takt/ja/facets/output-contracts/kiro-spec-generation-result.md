{extends: validation}

# Kiro Spec Generation Result Output Contract

## Machine Fields

- `phase`: `init`、`requirements`、`design`、`tasks`、`quick` のいずれか。
- `validation`: `verdict`、`evidence`、`findings`、必要に応じて `sharedContractValidation` を持つ object。
- `validation.verdict`: `PASS`、`NEEDS_FIX`、`BLOCKED` のいずれか。
- `draft_status`: 存在する場合の lifecycle draft state。`READY_FOR_REVIEW` または `WRITTEN` のいずれか。
- `review_gate`: `PENDING`、`PASSED`、`FAILED`、`NOT_APPLICABLE` のいずれか。
- `featureName`: `.kiro/specs/<feature>` 配下の canonical feature directory name。
- `updatedFiles`: 現在の step が書いた repository-relative path の配列。
- `draft_artifacts`: review gate が読む draft 本文。必要な場合は `requirements`、`design`、`research`、`tasks` の key を持つ object。
- `nextAction`: 次に必要な approval、correction、または phase command。不要な場合は optional。
- `blockingReason`: `validation.verdict` が `BLOCKED` の場合は必須。`PASS` では省略または空にする。

## Result Rules

- `PASS` は、報告された `phase` に対する現在の generation、repair、review、または finalize step が成功したことを表す。lifecycle promotion は `draft_status` と `review_gate` で判断する。
- `READY_FOR_REVIEW` と `review_gate: PENDING` の組み合わせは、dedicated read-only review step が読む draft artifacts が `draft_artifacts` または step report の draft section に存在し、`spec.json` lifecycle promotion はまだ行われていないことを表す。
- `WRITTEN` と `review_gate: PASSED` の組み合わせは、review gate 通過後に finalize step が phase artifacts と lifecycle metadata を書いたことを表す。
- `validation.verdict: NEEDS_FIX` は、review 可能な output はあるが、finding を修正するまで lifecycle metadata を進めてはいけないことを表す。
- `validation.verdict: BLOCKED` は、workflow が artifact を安全に書けない、または lifecycle metadata を進められないことを表す。
- lifecycle metadata update が成功した場合にのみ、`updatedFiles` には `spec.json` を含める。
- `blockingReason` には progress を止めた gate を書く。例: phase gate、artifact write、metadata update、feature name conflict、ambiguity、review gate。
