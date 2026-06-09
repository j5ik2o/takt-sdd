# Design Review Gate

Before writing `design.md`, review the draft design and repair local issues until the design passes or a true spec gap is discovered.

## Requirements Coverage Review

- Every numeric requirement ID from `requirements.md` must appear in the design traceability mapping and be backed by one or more concrete components, contracts, flows, data models, or operational decisions.
- Every requirement that introduces an external dependency, integration point, runtime prerequisite, migration concern, observability need, security constraint, or performance target must be reflected explicitly in `design.md`.
- If coverage is missing because the design draft is incomplete, repair the draft and review again.
- If coverage cannot be completed cleanly because requirements are ambiguous, contradictory, or underspecified, stop and return to the requirements phase instead of inventing design detail.

## Architecture Readiness Review

- Component boundaries must be explicit enough that implementation tasks can be assigned without guessing ownership.
- Interfaces, contracts, state transitions, and integration boundaries must be concrete enough for implementation and validation.
- Build-vs-adopt decisions that materially affect architecture must be captured in `design.md`, with deeper investigation left in `research.md` when present.
- Runtime prerequisites, migrations, rollout constraints, validation hooks, and failure modes must be surfaced when they materially affect implementation order or risk.

## Boundary Readiness Review

- The design must explicitly state what this spec owns.
- The design must explicitly state what is out of boundary.
- Allowed dependencies must be concrete enough that reviewers can detect boundary violations later.
- If data, behavior, or integration responsibility appears shared across multiple areas without a clear seam, stop and repair the design.
- If downstream assumptions are embedded in upstream components "for convenience," stop and repair the design.
- If the boundary cannot be explained in a few direct bullets, it is probably still too vague for task generation.
- If the design reveals multiple independent responsibility seams that could move separately, stop and split the spec or return to roadmap discovery instead of forcing them into one spec.

## Executability Review

- The design must be implementable as a sequence of bounded tasks without hidden prerequisites.
- Parallel-safe boundaries should be visible where the architecture intends concurrent implementation.
- Avoid speculative abstraction: remove components, adapters, or interfaces that exist only for hypothetical future scope.
- If a section is too vague for tasks to reference directly, rewrite it before finalizing the design.

## Mechanical Checks

Before applying judgment, verify these mechanically:
- **Artifact language selected**: Read `spec.json.language` before section-name checks. Use the matching Japanese or English terms from `.kiro/settings/templates/specs/localized-spec-terminology.md`. If the language is missing or unsupported, or the localized terminology file is missing, stop and clarify the target language or repository setup before applying this gate.
- **Requirements traceability**: Extract all numeric requirement IDs from `requirements.md` using the requirement heading form for `spec.json.language` from `.kiro/settings/templates/specs/localized-spec-terminology.md`; also accept existing hybrid headings that use the alternate Japanese/English heading term and existing numeric requirement list items. Scan the design draft for each ID. Report any IDs not found in the design.
- **Boundary section populated**: The design boundary section and boundary subsections named by `.kiro/settings/templates/specs/localized-spec-terminology.md` must not be empty or placeholder-only. Also accept existing hybrid headings that use the alternate Japanese/English heading terms from the same terminology row.
- **File structure section populated**: The file structure section named by `.kiro/settings/templates/specs/localized-spec-terminology.md` must contain concrete file paths (not just "TBD" or empty). Also accept the alternate Japanese/English file structure heading from the same terminology row. Scan for placeholder text in that section.
- **Boundary ↔ file structure alignment**: The file structure section must reflect the stated responsibility boundary. If files imply broader ownership than the boundary section claims, report a mismatch.
- **No orphan components**: Every component mentioned in the design must appear in the file structure section with a file path. Scan for component names that have no corresponding file entry.

## Review Loop

- Run mechanical checks first, then judgment-based review.
- If issues are local to the draft, repair the draft and re-run the review gate.
- Keep the loop bounded: no more than 2 review-and-repair passes before escalating a real spec gap.
- Write `design.md` only after the review gate passes.
