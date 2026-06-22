{extends: review-arch}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-batch` または `/kiro-spec-batch` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-batch` または `/kiro-spec-batch` の `## Step 4: Cross-Spec Review` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Cross-Spec Review Instruction

## Kiro-specific delta

batch worker dispatch 後の generated specs を review します。individual generation workflow だけでは検証できない cross-spec consistency に集中します。

## Inputs

- `.kiro/steering/roadmap.md`。
- primary architecture input としての generated `.kiro/specs/*/design.md`。
- scope と acceptance criteria 用の generated `.kiro/specs/*/requirements.md`。
- `_Boundary:_` annotation 用の generated `.kiro/specs/*/tasks.md`。
- `$kiro-spec-batch` または `/kiro-spec-batch` の worker feature results と skipped spec-ready entries。

## Review Checks

- generated specs 間の data model consistency。
- upstream/downstream specs 間の interface alignment。
- duplicate functionality と ownership overlap。
- roadmap dependency order に対する dependency completeness。
- components、paths、contract fields の naming conventions。
- shared infrastructure ownership。
- `_Boundary:_` annotations と roadmap dependency direction の task boundary alignment。

## Output Mapping

- `verdict`、`issues`、`severity`、`affectedSpecs`、`suggestedFix`、`repairTarget`、optional `DECOMPOSITION_RETURN` を持つ `kiro-cross-spec-review` を返す。
- local patch ではなく decomposition または roadmap boundary 問題の場合は `DECOMPOSITION_RETURN` を使う。
- review は read-only に保つ。remediation は `coordinate-remediation` が routing する。
