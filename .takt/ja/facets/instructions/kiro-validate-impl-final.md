{extends: supervise}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-validate-impl` または `/kiro-validate-impl` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-validate-impl` または `/kiro-validate-impl` の `### 4. Generate Report` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Final Implementation Validation Adapter

## Kiro 固有差分

selected task progress handlingの後にfeature-level validationを実行する。このadapterはread-onlyであり、task implementationは実行しない。

## Output mapping

`$kiro-validate-impl` または `/kiro-validate-impl` のvalidation reportを返す。

- `DECISION`: `GO`、`NO-GO`、`MANUAL_VERIFY_REQUIRED` のいずれか。
- `MECHANICAL_RESULTS`: 利用可能なtest、static check、smoke evidence。
- `INTEGRATION`、`COVERAGE`、`DESIGN`: feature-level assessment。
- `BLOCKED_TASKS`: blocker impact。

workflow rulesは `DECISION` で分岐する。single selected task iterationでは、`NO-GO` と `MANUAL_VERIFY_REQUIRED` はここで暗黙修復せずvalidation evidenceとして表面化する。`FEATURE_GO` evidenceはfeature-level claimsにだけ使う。
