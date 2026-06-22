{extends: review-arch}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-validate-design` または `/kiro-validate-design` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-validate-design` または `/kiro-validate-design` の `## Execution Steps` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Design Validation Readiness

## Kiro 固有差分

この instruction は読み取り専用です。standalone validation では `requirements.md`、`design.md`、任意の `research.md`、`spec.json` を確認し、design artifact は変更しません。`kiro-spec-design` または `kiro-spec-quick` の generation review 中は、まだ `design.md` が書かれていない draft review mode として扱います。

## Draft review mode

- active workflow が `kiro-spec-design` または `kiro-spec-quick` で、直前の generation / repair result が `phase: "design"`、`draft_status: "READY_FOR_REVIEW"`、`review_gate: "PENDING"` の場合、review 対象は `.kiro/specs/<feature>/design.md` ではなく current run の draft report です。
- draft report は、current Report Directory または Previous Response にある `kiro-spec-design-result.md`、`kiro-spec-design-repair-result.md`、`kiro-spec-quick-design-result.md`、`kiro-spec-quick-design-repair-result.md` をこの順で探します。
- draft report 内の `draft_artifacts.design`、`draft_artifacts.research`、または `## design.md draft` / `## research.md draft` という Markdown heading を design draft / research draft として扱います。
- draft review mode の review target は design draft に固定します。git diff、current dirty worktree、workflow/facet/script/test の未コミット差分を design review target として扱ってはなりません。
- `git diff` を実行する場合は、必ず `.kiro/specs/<feature>/` または current run report path に path filter を付ける。unscoped git diff、つまり path filter なしの `git diff` は draft review mode では禁止する。
- draft 本文を取得できない場合、git diff や `.kiro/specs/<feature>/design.md` や別 phase artifact へフォールバックしてはなりません。
- draft review mode では、`spec.json` が `phase: "requirements-generated"` のまま、`approvals.design.generated: false` のままであることは正常です。これを `ARTIFACT_MISSING` や `LIFECYCLE_INCONSISTENT` として扱ってはなりません。
- draft 本文が見つからない場合は `DECISION: MANUAL_VERIFY_REQUIRED` または `DECISION: NO-GO` を返し、`missing_draft_artifact` として報告します。存在しない `.kiro/specs/<feature>/design.md` を要求してはいけません。
- git diff、current dirty worktree、または unrelated workflow/facet changes を design draft の代わりにレビューした場合は `DECISION: NO-GO` とし、`review_target_scope_mismatch` として報告します。この状態を local repair possible として扱ってはいけません。

## Validation procedure

1. requirements と design artifact が存在し、approval と phase が矛盾していないことを確認する。draft review mode では、draft report の design draft を design artifact として扱う。
2. design traceability table で requirements coverage を確認する。
3. 境界コミットメント、境界外、許可する依存、再検証トリガーを確認する。
4. ファイル構造計画と component mapping を照合する。
5. validation hooks と repository-local test strategy を確認する。
6. 下流責務をこの設計が吸収している場合は、boundary violation finding とともに `DECISION: NO-GO` を返す。

## Output mapping

shared `kiro-validation-result` contract を使う。継承元 skill の GO/NO-GO readiness 判断は、必ず `DECISION: <GO|NO-GO|MANUAL_VERIFY_REQUIRED>` 行へ正規化する。`DECISION` machine field を持たない素の GO/NO-GO verdict は返さない。workflow routing 用の primary field として必ず `DECISION` を設定する。design readiness を満たす場合は `GO`、lifecycle failure または design drift は `NO-GO`、evidence を自動確認できない場合は `MANUAL_VERIFY_REQUIRED` を返す。

## AI quality gate evidence

- `DECISION: GO` を返す前に、current run の namespaced AI gate review report を確認する:
  `reports/subworkflows/iteration-*--step-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  または `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`。
- draft review mode では、その AI gate report が design draft を対象にしていることを確認します。report は `review_target: design_draft` または同等の明示 evidence を含まなければなりません。report が requirements draft など別 phase を対象にしている場合は `DECISION: NO-GO` とし、`ai_gate_scope_mismatch` として報告します。
- draft review mode では、AI gate report が git diff、current dirty worktree、または unrelated workflow/facet changes を対象にしている場合も `DECISION: NO-GO` とし、`ai_gate_scope_mismatch` として報告します。この状態を local repair possible として扱ってはいけません。
- AI gate report が `review_target: git_diff`、unscoped git diff、または path filter なしの `git diff` を evidence としている場合は `DECISION: NO-GO` とし、`ai_gate_scope_mismatch` として報告します。
- active workflow が standalone `kiro-validate-design` で、current run に `kiro-spec-ai-antipattern-review.md` が存在しない場合は、AI quality gate evidence check をスキップし、通常の validation procedure のみで判断する。この read-only workflow は gate を実行しない。
- `kiro-spec-design` や `kiro-spec-quick` などの generation review workflow で `kiro-spec-ai-antipattern-review.md` が存在しない場合は、design readiness を accept せず `DECISION: MANUAL_VERIFY_REQUIRED` を返す。
- unresolved AI antipattern findings が残る場合は `DECISION: NO-GO` を返す。
- 対応する namespaced `kiro-spec-ai-antipattern-fix.md` が存在する場合、stale、cross-run、blocked、evidence-free no-fix outcomes を reject する。
- first review が blocking issue を見つけなかった場合だけ、`kiro-spec-ai-antipattern-fix.md` が存在しなくても valid と扱う。これは optional fix report であり、required success artifact ではない。
- rejected AI gate evidence は design readiness accept ではなく既存の `NO-GO` または `MANUAL_VERIFY_REQUIRED` result へ route する。
