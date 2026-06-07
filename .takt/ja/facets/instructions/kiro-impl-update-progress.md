---
extends_skill: kiro-impl
extends_skill_section: "### Manual Mode (main context)"
---

{extends: fix}

# Kiro Progress Update Adapter

## Kiro 固有差分

completion verificationまたはblocker decisionの後に、selected task progressだけを更新する。書き込み直前にselected task sectionを必ずre-readする。

## Update rules

1. completion `STATUS` が `VERIFIED` かつ `safe_to_update_progress` がtrueの場合だけ、selected task checkboxを `- [x]` に変更する。
2. implementation evidenceと `Implementation Notes` はselected taskまたは共有notes section内だけに追記・更新する。
3. `BLOCK_TASK`、`STOP_FOR_HUMAN`、またはmonitorの非生産的処理でこのstepに来た場合、checkboxは更新せず、selected taskにblocker noteを書く。
4. planning後にselected task stateが変わっている場合、他workerを上書きせず停止する。
5. unrelated task checkboxes、blocker notes、completion evidenceは変更しない。

## Output mapping

progress updateは、上流adapter stepで `STATUS`、`VERDICT`、`NEXT_ACTION`、completion `STATUS` が解決済みの場合だけ許可する。
