# Architecture

[Purpose: define the architectural style, layer boundaries, and dependency rules for the project]

## Philosophy
- Architecture is about dependency direction, not folder names
- Isolate domain logic from infrastructure concerns
- Make the architecture enforceable through code structure

## Architectural Style
Choose one (or combine with rationale):
- Layered (traditional N-tier)
- Hexagonal / Ports & Adapters
- Clean Architecture
- Onion Architecture
- CQRS / Event Sourcing
- Actor Model
- Microservices / Modular Monolith

Selected: [style]
Rationale: [why this style fits the project]

## Layer Boundaries
Define layers and their allowed dependencies:
```
[outer] → [inner] (dependency direction)
```
Example (Hexagonal):
```
infrastructure → application → domain
     adapters → ports → domain model
```

Rules:
- Inner layers MUST NOT depend on outer layers
- Cross-layer communication through interfaces/ports defined in the inner layer
- [project-specific rules]

## Component Organization
How components map to the architecture:
- Domain: [entities, value objects, domain services, aggregates]
- Application: [use cases, ports, application services]
- Infrastructure: [adapters, repositories impl, external APIs]
- Presentation: [controllers, CLI, API handlers]

## Concurrency Model (if applicable)
- Threading: [single-threaded / multi-threaded / async / actor-based]
- Actor framework: [Akka / Actix / Tokio actors / none]
- Message passing: [sync / async / event-driven]

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| [e.g., DI approach] | [e.g., constructor injection] | [why] |
| [e.g., error propagation] | [e.g., Result type] | [why] |

---
_Focus on dependency rules and boundaries, not implementation details._
