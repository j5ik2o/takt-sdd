---
extends_skill: kiro-validate-design
extends_skill_section: "## Execution Steps"
---

{extends: review-arch}

# Kiro Design Validation Readiness

## Kiro 固有差分

この instruction は読み取り専用です。`requirements.md`、`design.md`、任意の `research.md`、`spec.json` を確認し、design artifact は変更しません。

## Validation procedure

1. requirements と design artifact が存在し、approval と phase が矛盾していないことを確認する。
2. design traceability table で requirements coverage を確認する。
3. Boundary Commitments、Out of Boundary、Allowed Dependencies、Revalidation Triggers を確認する。
4. File Structure Plan と component mapping を照合する。
5. validation hooks と repository-local test strategy を確認する。
6. 下流責務をこの設計が吸収している場合は、boundary violation finding とともに `DECISION: NO-GO` を返す。

## Output mapping

shared `kiro-validation-result` contract を使う。継承元 skill の GO/NO-GO readiness 判断は、必ず `DECISION: <GO|NO-GO|MANUAL_VERIFY_REQUIRED>` 行へ正規化する。`DECISION` machine field を持たない素の GO/NO-GO verdict は返さない。workflow routing 用の primary field として必ず `DECISION` を設定する。design readiness を満たす場合は `GO`、lifecycle failure または design drift は `NO-GO`、evidence を自動確認できない場合は `MANUAL_VERIFY_REQUIRED` を返す。

## AI quality gate evidence

- `DECISION: GO` を返す前に `kiro-spec-ai-antipattern-review.md` を確認する。
- active workflow が standalone `kiro-validate-design` で、current run に `kiro-spec-ai-antipattern-review.md` が存在しない場合は、AI quality gate evidence check をスキップし、通常の validation procedure のみで判断する。この read-only workflow は gate を実行しない。
- `kiro-spec-design` や `kiro-spec-quick` などの generation review workflow で `kiro-spec-ai-antipattern-review.md` が存在しない場合は、design readiness を accept せず `DECISION: MANUAL_VERIFY_REQUIRED` を返す。
- unresolved AI antipattern findings が残る場合は `DECISION: NO-GO` を返す。
- `kiro-spec-ai-antipattern-fix.md` が存在する場合、stale、cross-run、blocked、evidence-free no-fix outcomes を reject する。
- first review が blocking issue を見つけなかった場合だけ、`kiro-spec-ai-antipattern-fix.md` が存在しなくても valid と扱う。これは optional fix report であり、required success artifact ではない。
- rejected AI gate evidence は design readiness accept ではなく既存の `NO-GO` または `MANUAL_VERIFY_REQUIRED` result へ route する。
