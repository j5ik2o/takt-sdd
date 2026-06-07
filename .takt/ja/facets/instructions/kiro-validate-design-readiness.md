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

shared `kiro-validation-result` contract を使う。workflow routing 用の primary field として必ず `DECISION` を設定する。design readiness を満たす場合は `GO`、lifecycle failure または design drift は `NO-GO`、evidence を自動確認できない場合は `MANUAL_VERIFY_REQUIRED` を返す。
