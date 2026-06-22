{extends: existing-system-respect}

# Kiro Implementation Task Progress Policy

Full custom reason: N/A; this facet extends existing-system-respect and narrows artifact writes for Kiro task progress.

## Progress gate

- selected taskだけを更新する。
- checkboxを `- [x]` に変更できるのは、completion `STATUS` が `VERIFIED` かつ `safe_to_update_progress` がtrueの場合だけ。
- `READY_FOR_REVIEW`、review `VERDICT APPROVED`、validation evidenceは必要条件だが、completion verificationなしでは十分ではない。
- `BLOCK_TASK`、`STOP_FOR_HUMAN`、`MANUAL_VERIFY_REQUIRED` はcompletion checkboxではなくblocker noteを書く。

## Artifact write boundary

- 書き込み直前にselected task sectionをre-readする。
- unrelated checkboxes、blocker notes、implementation evidenceを変更しない。
- `Implementation Notes` は短くし、observed evidenceに結びつける。
- selected task stateが変わっている場合、他workerを上書きせず停止する。
