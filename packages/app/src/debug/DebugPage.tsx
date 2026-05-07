/**
 * Throwaway debug page (dev-only). Lists all tasks in the registered
 * backends and exposes create / toggle-status / delete buttons. Used to
 * verify the backend wiring and the TanStack Query hooks before the
 * real views land in phases 5+. Strings are intentionally not
 * translated — this surface ships only in dev builds.
 */
import type { Quadrant } from '@emt/backend-core';
import { Button, Card } from '@emt/design-system';
import { useState, type ReactNode } from 'react';

import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../queries/tasks.js';

const QUADRANTS: readonly Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function DebugPage(): ReactNode {
  const tasks = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState('');
  const [quadrant, setQuadrant] = useState<Quadrant>('Q1');

  const submit = (): void => {
    const trimmed = title.trim();
    if (trimmed === '') return;
    createTask.mutate({
      draft: {
        title: trimmed,
        notes: '',
        priority: 'normal',
        quadrant,
        status: 'open',
        tags: [],
      },
    });
    setTitle('');
  };

  return (
    <main data-view="debug" style={{ padding: 'var(--space-lg)' }}>
      <h1>Debug</h1>
      <p>Dev-only page for verifying the IndexedDB-backed task store.</p>

      <section style={{ marginBlock: 'var(--space-lg)' }}>
        <h2>Create</h2>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <input
            aria-label="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <select
            aria-label="Quadrant"
            value={quadrant}
            onChange={(e) => setQuadrant(e.target.value as Quadrant)}
          >
            {QUADRANTS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <Button onClick={submit} disabled={title.trim() === '' || createTask.isPending}>
            Create
          </Button>
        </div>
        {createTask.isError && <p role="alert">Create failed: {createTask.error.message}</p>}
      </section>

      <section>
        <h2>Tasks ({tasks.data?.length ?? 0})</h2>
        {tasks.isLoading && <p>Loading…</p>}
        {tasks.isError && <p role="alert">List failed: {tasks.error.message}</p>}
        {tasks.data?.length === 0 && <p>No tasks yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-sm)' }}>
          {tasks.data?.map((task) => (
            <li key={`${String(task.backendId)}:${String(task.id)}`}>
              <Card data-task-id={task.id}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span style={{ flex: 1 }}>
                    <strong>{task.title}</strong> · {task.quadrant} · {task.status}
                  </span>
                  <Button
                    variant="tonal"
                    onClick={() =>
                      updateTask.mutate({
                        backendId: task.backendId,
                        id: task.id,
                        patch: { status: task.status === 'open' ? 'done' : 'open' },
                      })
                    }
                  >
                    Toggle
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => deleteTask.mutate({ backendId: task.backendId, id: task.id })}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
