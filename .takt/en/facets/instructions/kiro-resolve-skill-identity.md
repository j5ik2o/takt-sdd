# Kiro Skill Identity Resolution

Full custom reason: built-in instruction facets do not define Kiro host skill roots or npm-script-to-skill normalization.

## Contract

Normalize Kiro skill expressions before any downstream workflow uses source assets.

## Machine Rules

- Strip a leading `$` or `/` from command-style expressions.
- Strip `npm run ` and take the script name before `--` or the first argument.
- Convert supported npm script names to canonical skill identity:
  - `kiro:discovery` -> `kiro-discovery`
  - `kiro:spec:init` -> `kiro-spec-init`
  - `kiro:spec:requirements` -> `kiro-spec-requirements`
  - `kiro:validate:gap` -> `kiro-validate-gap`
  - `kiro:spec:design` -> `kiro-spec-design`
  - `kiro:validate:design` -> `kiro-validate-design`
  - `kiro:spec:tasks` -> `kiro-spec-tasks`
  - `kiro:spec:quick` -> `kiro-spec-quick`
  - `kiro:spec:batch` -> `kiro-spec-batch`
  - `kiro:spec:status` -> `kiro-spec-status`
  - `kiro:impl` -> `kiro-impl`
  - `kiro:validate:impl` -> `kiro-validate-impl`
  - `kiro:steering` -> `kiro-steering`
  - `kiro:steering-custom` -> `kiro-steering-custom`
- Preserve already canonical `kiro-*` names.
- Reject non-Kiro expressions with `UNSUPPORTED_KIRO_IDENTITY`.
- Look up source roots in this order:
  1. `.agents/skills/<identity>/SKILL.md`
  2. `.claude/skills/<identity>/SKILL.md`
- If the identity is supported but no source root exists, return `SKILL_SOURCE_MISSING`.
- Source roots are source assets only; they are not the TAKT runtime control plane.

## Required Result Fields

- `identity`
- `sourceRoots`
- `status`: `FOUND` or `MISSING`
- `errorCategory`: `UNSUPPORTED_KIRO_IDENTITY` or `SKILL_SOURCE_MISSING` when applicable
- `evidence`
