# Screen-Specific API Policy

Provide data through screen-specific API endpoints. Do not assemble screens by repurposing generic APIs.

## Principles

| Principle | Criteria |
|-----------|----------|
| Screen-API alignment | Provide dedicated endpoints matching each screen's data needs |
| Separate list and detail | Do not reuse list API responses for detail screens |
| Aggregation via aggregation API | Do not fetch all records to count/summarize on the client |
| Server owns pagination | Server manages page size, sort order, and filter conditions |
| Add API when missing | Add a backend endpoint rather than working around it on the frontend |

## Screen-Level API Design

Design endpoints based on "what does this screen display and what does it operate on."

| Pattern | Judgment | Reason |
|---------|----------|--------|
| List screen uses list API, detail screen uses detail API | OK | Screen and API responsibilities align |
| Detail screen calls list API and searches result by ID | REJECT | Fetches unnecessary data, API contract mismatch |
| Fetch all records to aggregate on the frontend for a decision | REJECT | Provide an aggregation API on the server |
| Fetch both processing and completed from same API, filter on frontend | REJECT | Server should return them separately |
| Screen needs data not available from existing APIs | Add an API | Do not combine other APIs as a workaround |

```typescript
// REJECT - Reusing list API for detail screen
async function loadDetail(id: string) {
  const list = await fetchList({ date })
  return list.items.find(item => item.id === id)
}

// OK - Detail screen uses detail API
async function loadDetail(id: string) {
  return await fetchDetail(id)
}
```

## Pagination and Data Volume Control

Pagination responsibility belongs to the server. Frontend does not specify page size; server returns an appropriate number.

| Pattern | Judgment |
|---------|----------|
| Server has default page size, frontend sends only nextId | OK |
| Frontend specifies limit and sends it to server | Avoid (can't change server-side only) |
| List API returns all records without limit | REJECT |
| Server validates limit upper bound | OK |

```typescript
// Avoid - Frontend decides page size
const result = await fetchList({ date, limit: 10, nextId })

// OK - Frontend sends only nextId, server decides page size
const result = await fetchList({ date, nextId })
```

## Aggregation and Decision Responsibility

Decisions like "how many exist," "can generate," "should regenerate" are computed by the server and returned as results.

| Pattern | Judgment |
|---------|----------|
| Fetch all records to determine batch generation eligibility | REJECT |
| Aggregation API returns confirmed/unconfirmed counts | OK |
| Server computes and returns canRegenerate flag | OK |
| Frontend compares generated memo IDs to determine regeneration eligibility | REJECT |

```typescript
// REJECT - Fetch all for decision-making
const memos = await fetchAllMemos({ date })
const canGenerate = memos.filter(m => m.confirmed).length > 0

// OK - Server returns aggregation
const counts = await fetchMemoCounts({ date })
// counts: { childId, memoCount, confirmedCount, unconfirmedCount }
```

## Tab/Screen Navigation and Communication Scope

Communication is scoped to the active tab/screen. Do not prefetch for other tabs.

| Pattern | Judgment |
|---------|----------|
| Only the visible tab communicates on tab switch | OK |
| Parent component fetches for all tabs and distributes to children | REJECT |
| Periodic polling runs only on the visible screen | OK |
| Polling continues on hidden tabs | REJECT |

## Backend Responsibilities

Backend provides the following so that frontend can use screen-specific APIs.

| Responsibility | Content |
|---------------|---------|
| Separate list and detail | List returns lightweight summaries, detail includes full information |
| Embed related data | Include related data the screen needs in the response (avoid N+1) |
| Aggregation endpoints | Return counts, confirmation status via dedicated endpoints |
| Decision flags | Server computes can-regenerate, can-generate flags |
| Pagination infrastructure | nextId cursor, default page size, limit validation |

## Prohibited

- **Generic API reuse** - Do not use list APIs for detail screens or fetch-all for aggregation
- **Frontend-side aggregation** - Do not fetch all records to count on the client
- **Cross-tab communication** - Do not prefetch data for other tabs
- **Frontend page size specification** - Let the server decide
- **Frontend workaround for missing API** - Add a dedicated endpoint instead
