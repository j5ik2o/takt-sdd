{extends: task-decomposition}

# Kiro Roadmap Dependency Waves Policy

## Roadmap Structure

`kiro-discovery` は `.kiro/steering/roadmap.md` に次の project-level section を作成または更新できる:

- `## Overview`
- `## Approach Decision`
- `## Scope`
- `## Constraints`
- `## Boundary Strategy`
- `## Specs (dependency order)`

`kiro-spec-batch` の wave execution で authoritative input になるのは `## Specs (dependency order)` だけです。batch entry は次の形にする:

```text
- [ ] feature-name -- One-line description. Dependencies: none
- [ ] downstream-feature -- One-line description. Dependencies: feature-name
```

`Dependencies: none` は、その feature が未完了なら最初の wave に入れることを意味します。

## Awareness-Only Sections

roadmap には次の section を context として置けるが、これらは awareness-only であり dependency wave に入れてはいけない:

- `## Existing Spec Updates`
- `## Direct Implementation Candidates`

これらの section は review context や sequencing advice には使えるが、worker dispatch input ではなく、`brief.md` creation も要求しない。

## Blocking Conditions

- `## Specs (dependency order)` がない場合は batch execution を止める。
- missing dependency name は batch execution を止める。
- `circular dependency` は batch execution を止める。
- unknown completion marker は batch execution を止める。
- pending spec に `.kiro/specs/<feature>/brief.md` がない場合は worker dispatch 前に止める。
