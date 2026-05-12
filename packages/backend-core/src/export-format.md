# EMT export format (v1)

The Data panel (view4) round-trips tasks across all registered
backends through a JSON file. The shape is intentionally flat and
versioned so future migrations stay manageable.

```jsonc
{
  "version": 1,
  "exportedAt": "2026-05-13T12:00:00.000Z",
  "backends": [
    {
      "backendId": "local",
      "displayName": "Local",
      "tasks": [
        {
          "id": "…",
          "backendId": "local",
          "title": "Read book",
          "notes": "",
          "dueDate": "2026-06-01",
          "dueTime": "14:30",
          "priority": "normal",
          "quadrant": "Q2",
          "status": "open",
          "createdAt": "…",
          "updatedAt": "…",
          "tags": []
        }
      ]
    }
  ]
}
```

## Round-trip rules

- Every task is exported in canonical `Task` shape exactly as
  returned by `adapter.list()`. The export does NOT collapse
  optional fields (`dueDate`, `dueTime`, `completedAt`) — if a task
  has them, they're written; if not, the key is absent.
- On import:
  - Tasks whose `backendId` exists in the live registry are
    `adapter.create(task)`-ed against that backend, getting fresh
    `id`/`createdAt`/`updatedAt` from the adapter.
  - Tasks whose `backendId` is not registered fall through to the
    default backend.
- The export does NOT include manual ranks (the
  `taskOrder` IDB store) — those are UI state, scoped to the
  device. Import lands tasks at the secondary-sort tail.
- Clear-local-cache deletes the `tasks` IDB rows for the local
  backend only; remote-backend caches and the outbox are untouched.

## Versioning

- The file's `version` field is the import format version. v1 is
  the only supported version today. Future versions add fields
  (e.g., `taskOrder`) or change `Task` shape; the importer will
  refuse unknown versions rather than guess.
