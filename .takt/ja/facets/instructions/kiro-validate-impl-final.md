---
extends_skill: kiro-validate-impl
extends_skill_section: "### 4. Generate Report"
---

{extends: supervise}

# Kiro Final Implementation Validation Adapter

## Kiro 固有差分

selected task progress handlingの後にfeature-level validationを実行する。このadapterはread-onlyであり、task implementationは実行しない。

## Output mapping

`kiro-validate-impl` のvalidation reportを返す。

- `DECISION`: `GO`、`NO-GO`、`MANUAL_VERIFY_REQUIRED` のいずれか。
- `MECHANICAL_RESULTS`: 利用可能なtest、static check、smoke evidence。
- `INTEGRATION`、`COVERAGE`、`DESIGN`: feature-level assessment。
- `BLOCKED_TASKS`: blocker impact。

workflow rulesは `DECISION` で分岐する。single selected task iterationでは、`NO-GO` と `MANUAL_VERIFY_REQUIRED` はここで暗黙修復せずvalidation evidenceとして表面化する。`FEATURE_GO` evidenceはfeature-level claimsにだけ使う。
