```markdown
# Technical Design: {feature name}

## Overview
{Purpose, target users, and scope of impact in 2-3 paragraphs}

## Goals and Non-Goals
### Goals
- {primary objective}

### Non-Goals
- {explicitly excluded functionality}

## Architecture
### Technology Stack
| Layer | Technology/Version | Role |
|-------|-------------------|------|
| {layer} | {technology} | {role} |

### Architecture Diagram
{Mermaid diagram (only when 3+ components interact)}

## Components and Interfaces
| Component | Domain/Layer | Intent | Requirements Coverage |
|-----------|-------------|--------|----------------------|
| {name} | {layer} | {intent} | {requirement ID} |

## Data Model
### Domain Model
{Aggregates, entities, value objects, invariants}

## Requirements Traceability
| Requirement | Summary | Component | Interface |
|-------------|---------|-----------|-----------|
| {ID} | {summary} | {corresponding component} | {corresponding interface} |

## Error Handling
{Error strategy and categories}

## Test Strategy
- Unit: {3-5 items}
- Integration: {3-5 items}
```
