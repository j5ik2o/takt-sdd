# Kiro Skill Identity Resolution

Full custom reason: built-in instruction facets do not define Kiro host skill roots or npm-script-to-skill normalization.

## Contract

Kiro skill expression は、下流 workflow が source asset を使う前に正規化する。

## Machine Rules

- command-style expression の先頭 `$` または `/` を除去する。
- `npm run ` を除去し、`--` または最初の引数より前の script 名を読む。
- supported npm script name は canonical skill identity へ変換する:
  - `kiro:impl` -> `kiro-impl`
  - `kiro:spec:quick` -> `kiro-spec-quick`
  - `kiro:spec:requirements` -> `kiro-spec-requirements`
  - `kiro:validate:design` -> `kiro-validate-design`
- すでに canonical な `kiro-*` name はそのまま扱う。
- Kiro ではない expression は `UNSUPPORTED_KIRO_IDENTITY` として reject する。
- source root は次の順で探す:
  1. `.agents/skills/<identity>/SKILL.md`
  2. `.claude/skills/<identity>/SKILL.md`
- supported identity だが source root がない場合は `SKILL_SOURCE_MISSING` を返す。
- source root は source asset であり、TAKT runtime control plane ではない。

## Required Result Fields

- `identity`
- `sourceRoots`
- `status`: `FOUND` or `MISSING`
- `errorCategory`: `UNSUPPORTED_KIRO_IDENTITY` or `SKILL_SOURCE_MISSING` when applicable
- `evidence`
