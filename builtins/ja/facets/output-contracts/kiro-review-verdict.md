{extends: validation}

# Kiro Review Verdict Output Contract

Full custom reason: N/A; this facet extends the built-in validation output contract and defines review verdict fields.

## Machine Fields

- `VERDICT`: `APPROVED`, `REJECTED` のいずれか。
- `verdict`: `VERDICT` を補足的に写像する任意 field。workflow branching では `VERDICT` を使う。
- `review_scope`: review 対象の selected task、feature、または contract boundary。
- `findings`: actionable finding の配列。
- `requirement_refs`: 元の requirement 番号の配列。
- `task_refs`: 元の task 番号または task label の配列。
- `boundary_violations`: boundary を越えた責務混入の配列。
- `evidence`: 確認した file、command result、design reference。
- `summary`: 人間向け review summary のみ。

## Branching Rule

workflow rule は `VERDICT` を参照して分岐する。`verdict` と `summary` は primary machine field ではない。
