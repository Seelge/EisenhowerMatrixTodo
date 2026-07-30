# Loading / error / empty audit (Step 11.2)

This checklist tracks which views use the design-system primitives
(`Skeleton`, `ErrorBanner`, `EmptyNote`) and why. The mechanical grep
in `done-when` reads:

```sh
grep -nE 'Skeleton|ErrorBanner|EmptyNote' packages/app/src/views/**/*.tsx
```

Every view that surfaces an async query result must show a
`Skeleton` while pending, an `ErrorBanner` (with a retry) on error,
and either an `EmptyNote` or a deliberate empty visual when no data
is present.

| View                            | Loading              | Error               | Empty                                | Notes |
| ------------------------------- | -------------------- | ------------------- | ------------------------------------ | ----- |
| `matrix/MatrixView.tsx`         | n/a (shell only)     | n/a                 | n/a                                  | Owns the 2×2 grid + FAB; each cell is responsible for its own state. |
| `matrix/MatrixCell.tsx`         | `Skeleton` (last count) | `ErrorBanner` + retry | `EmptyNote` when zero visible tasks | Phase 16: empty note when filter/hide-completed leaves the cell empty. Skeletons use last known count (clamped). |
| `quadrant/QuadrantView.tsx`     | `Skeleton` ×3        | `ErrorBanner` + retry | `EmptyNote`                        | Full-screen view, needs all three. |
| `task/TaskView.tsx`             | `Skeleton` ×4        | `ErrorBanner` + retry | `EmptyNote`                        | Patched in this step — previously rendered a bare `<p>` for the not-found case, which conflated loading and missing. |
| `options/OptionsView.tsx`       | n/a (shell only)     | n/a                 | n/a                                  | Pure routing surface. |
| `options/OptionsList.tsx`       | n/a                  | n/a                 | n/a                                  | Static list of groups. |
| `options/BackendsPanel.tsx`     | n/a                  | n/a                 | n/a                                  | Reads the registry synchronously after `getBackends()` resolves. Future remote backends would surface their own "connect" errors, not load errors. |
| `options/AccountPanel.tsx`      | n/a                  | n/a                 | n/a                                  | Declarative — no fetch. |
| `options/AppearancePanel.tsx`   | n/a                  | n/a                 | n/a                                  | Reads from `useAppearanceStore` (mirrored React state; `load()` is fire-and-forget on App mount). |
| `options/DefaultsPanel.tsx`     | n/a                  | n/a                 | n/a                                  | Same as Appearance — store-backed. |
| `options/DataPanel.tsx`         | n/a (one-shot ops)   | `ErrorBanner` (inline) | n/a                                | Export/import/clear are user-triggered mutations, not background queries; failures surface inline via `ErrorBanner`. |
| `options/AboutPanel.tsx`        | n/a                  | n/a                 | n/a                                  | Renders compile-time literals. |
| `conflict/ConflictModal.tsx`    | n/a                  | n/a                 | n/a                                  | Modal — driven by the resolver promise, no internal query. |

## Patches applied in Step 11.2

- **`task/TaskView.tsx`**: split `TaskViewBody` into `pending` (4 ×
  `Skeleton`), `error` (`ErrorBanner` with a refetch retry), `empty`
  (`EmptyNote` with the existing `app.task.notFound` string), and the
  loaded path. Replaces the previous bare-`<p>` not-found notice.
- **`task/task-view.css`**: adds a small `__skeleton` rule so the four
  skeleton rows space evenly.

No changes to the other views — the audit confirmed their primitives
are already in place or the view has no asynchronous state.
