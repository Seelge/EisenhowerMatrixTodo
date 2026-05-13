# Time & date handling

This document spells out how dates and timestamps are represented across
the canonical `Task` model and the adapter contracts. The rules are
deliberately small — most "time-zone bugs" in scheduling apps come from
treating a wall-clock date as a UTC instant. We keep the two types
disjoint and convert at the edges only.

## Three field families

| Field family           | Fields                                | Type            | Semantics |
| ---------------------- | ------------------------------------- | --------------- | --------- |
| Wall-clock date        | `Task.dueDate`                        | `IsoDate`       | `YYYY-MM-DD`. Calendar day in the user's local zone. **Not** an instant. The string `"2026-05-13"` always means May 13 wherever the user is — it does not shift across time zones. |
| Wall-clock time-of-day | `Task.dueTime`                        | `IsoTime`       | `HH:mm` (24-hour). Local wall-clock minute. No offset, no seconds, no zone. Optional and only meaningful alongside a `dueDate`. |
| Instant                | `Task.createdAt`, `updatedAt`, `completedAt` | `IsoDateTime` | Full ISO 8601 with offset, normally produced via `new Date().toISOString()` (so the `Z` suffix). These mark when something *happened* on the wire and must round-trip across zones. |

The split matters because wall-clock dates and instants compose
differently:

- A wall-clock date never changes when the user travels. A task due on
  `2026-05-13` is due on May 13 in Berlin and in Los Angeles.
- An instant is a single point on the global timeline. `createdAt` in
  Berlin and the same `createdAt` viewed in Los Angeles refer to the
  same moment; only the local rendering differs.

## Round-trip rules

1. **Adapter writes.** When an adapter persists a `Task`, all three
   field families round-trip losslessly. For backends that store dates
   as `YYYY-MM-DD` strings, persist the string verbatim. For backends
   that demand a `DateTime`, anchor to local midnight (e.g. encode as
   `2026-05-13T00:00:00`) and document the convention in the adapter's
   `notes` if needed.
2. **Adapter reads.** A `dueDate` must come back identical to what was
   written. If a backend stores dates as full datetimes, the adapter
   strips the time component and re-emits `YYYY-MM-DD` using local-time
   components — never `toISOString().slice(0, 10)`, which would shift
   the date in negative-offset zones.
3. **UI parses dueDate via local-time components.** The canonical
   helper is `parseLocalDate(iso)` (exported from `@emt/design-system`)
   which constructs `new Date(Y, M-1, D)` rather than `new Date(iso)`.
   The latter parses bare `YYYY-MM-DD` as UTC midnight and shifts back
   by the local offset in zones west of UTC.
4. **UI emits dueDate via local-time components.** The canonical helper
   is `formatLocalDate(date)`, which reads `getFullYear`, `getMonth`,
   `getDate` from the local zone and zero-pads the components.

## DST does not affect wall-clock dates

A wall-clock date has 24 calendar hours by convention, never 23 or 25.
Code that adds calendar days (`addDays(date, n)` in
`due-date-helpers.ts`) shifts the underlying millisecond instant by
`n * 86_400_000` and then re-reads the local components — the result
is the correct next calendar day regardless of whether a DST boundary
fell inside the interval. The helper is exercised across both the
spring-forward and fall-back Sundays in `due-date-helpers.test.ts`.

The same reasoning applies to "today / tomorrow / this weekend / next
week" labels: they compare wall-clock dates against a wall-clock
`today` (normalised to local midnight), so the bucket is the same in
every zone for the same calendar inputs.

## Instants format consistently

`createdAt`, `updatedAt`, and `completedAt` always come from
`new Date().toISOString()` or pass through verbatim from the upstream
backend. The values include an offset (the `Z` suffix for UTC) so a
reader in any zone can compute a localised display via
`new Date(iso)`.

## Why we don't carry a zone

A previous draft considered adding `Task.dueZone: string` so a date
written in Berlin would "follow" the user to Los Angeles. We rejected
that for two reasons:

1. The mental model collapses. A user moving home from Berlin to LA
   wants their "May 13" task to still be due on May 13 — they would be
   actively surprised if it shifted to May 12 in LA.
2. The wire format complicates every adapter. Backends rarely have a
   native zone-aware date type, so each adapter would have to encode
   the zone into the notes field, defeating the goal of native
   round-tripping.

A `dueDateTime: IsoDateTime` field (full datetime with zone) may be
introduced later for calendar-style appointments; until then,
`dueDate` + `dueTime` carry the calendar-day intent only.
