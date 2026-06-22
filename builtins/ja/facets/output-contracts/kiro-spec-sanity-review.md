{extends: validation}

# Kiro Spec Sanity Review Output Contract

## Machine Fields

- `verdict`: `PASS`、`NEEDS_FIX`、`BLOCKED` のいずれか。
- `findings`: sanity review の指摘配列。`verdict` が `PASS` の場合は空配列にする。
- `findings[].finding_id`: 指摘を安定して参照する machine id。
- `findings[].category`: `coherence`、`hidden prerequisite`、`task annotation` のいずれか。
- `findings[].artifact`: `requirements`、`design`、`tasks` のいずれか。
- `findings[].evidence`: repository-relative な `file:line`、または section 根拠。
- `findings[].reason`: 矛盾、missing prerequisite、annotation drift の理由を短く書く。
- `findings[].required_action`: completion 前に必要な具体的修正。
- `requirements`: requirements coherence の `status`、`evidence`、必要に応じて `findings` を持つ object。
- `design`: design traceability と prerequisite の `status`、`evidence`、必要に応じて `findings` を持つ object。
- `tasks`: task annotation coverage の `status`、`evidence`、必要に応じて `findings` を持つ object。
- `fix_targets`: machine-readable な修正対象の配列。各 item は `artifact`、`path`、`finding_id`、`required_action` を必ず持つ。
- `blockingReason`: `verdict` が `BLOCKED` の場合は必須。`PASS` では省略または空にする。

## Verdict Rules

- `PASS` は、requirements、design、tasks が coherent で、hidden prerequisite がなく、task annotation coverage が完全であることを表す。
- `NEEDS_FIX` は、requirements、design、または tasks に少なくとも 1 つの fix target があるが、local repair 後に workflow を続行できることを表す。
- `BLOCKED` は、artifact 欠落、quick path boundary 外の prerequisite、または曖昧な correction target により、quick path が安全に completion を報告できないことを表す。
- `NEEDS_FIX` または `BLOCKED` の result には、少なくとも 1 件の `findings` item と 1 件の `fix_targets` item を含める。

## Branching Rules

- workflow rule は `summary` ではなく `verdict` を参照して分岐する。
- `PASS` だけが quick workflow completion を許可できる。
- `NEEDS_FIX` は `fix_targets` を使った correction に進める。
- `BLOCKED` は quick workflow を停止し、`blockingReason` を報告する。
