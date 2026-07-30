/**
 * Snackbar + SnackbarProvider + useSnackbar.
 *
 * The done-when criterion for Step 3.5 is the undo-vs-commit semantics:
 *   - undo within the timeout cancels the callback (onCommit not called)
 *   - timeout without undo commits
 * Plus the supersede behavior, the missing-provider error, and the
 * COMPONENT_CSS reduced-motion override for `.emt-snackbar`.
 *
 * Uses fake timers (`vi.useFakeTimers`) so we can advance the 5000 ms
 * window deterministically.
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPONENT_CSS } from '../src/components.ts';
import { Snackbar } from '../src/Snackbar.tsx';
import {
  SnackbarProvider,
  useSnackbar,
  type SnackbarShowOptions,
} from '../src/SnackbarProvider.tsx';

import { renderToContainer } from './render.ts';

/**
 * Test harness that exposes the `show` function via a captured ref so
 * tests can trigger it from outside React's render cycle.
 */
function Harness({ capture }: { capture: (api: ReturnType<typeof useSnackbar>) => void }) {
  const api = useSnackbar();
  capture(api);
  return null;
}

async function renderProvider() {
  let captured: ReturnType<typeof useSnackbar> | null = null;
  const handle = await renderToContainer(
    <SnackbarProvider>
      <Harness
        capture={(api) => {
          captured = api;
        }}
      />
    </SnackbarProvider>,
  );
  if (!captured) throw new Error('Snackbar API was not captured');
  return { ...handle, api: captured as ReturnType<typeof useSnackbar> };
}

describe('Snackbar primitive', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders with role="status" and aria-live="polite"', async () => {
    const { container, unmount } = await renderToContainer(<Snackbar message="Saved" />);
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('.emt-snackbar')!;
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.querySelector('.emt-snackbar__message')?.textContent).toBe('Saved');
    expect(el.querySelector('button')).toBeNull();
  });

  it('renders an Undo button only when onUndo is provided', async () => {
    const onUndo = vi.fn();
    const { container, unmount } = await renderToContainer(
      <Snackbar message="Deleted" onUndo={onUndo} />,
    );
    teardown = unmount;
    const btn = container.querySelector<HTMLButtonElement>('button')!;
    expect(btn.textContent).toBe('Undo');
    btn.click();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('honors a custom undoLabel', async () => {
    const { container, unmount } = await renderToContainer(
      <Snackbar message="Deleted" onUndo={() => {}} undoLabel="Restore" />,
    );
    teardown = unmount;
    expect(container.querySelector('button')?.textContent).toBe('Restore');
  });
});

describe('SnackbarProvider + useSnackbar', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    vi.useRealTimers();
  });

  it('throws a clear error when used outside a provider', async () => {
    // React's error-boundary path renders nothing on throw; we want the
    // throw to escape so the test catches it. Use a try/render pattern.
    let caught: unknown = null;
    try {
      await renderToContainer(
        <Harness
          capture={() => {
            // unreachable
          }}
        />,
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).toMatch(/useSnackbar must be used inside/);
  });

  it('shows the message and renders the Undo button when onUndo is set', async () => {
    const { container, api, unmount } = await renderProvider();
    teardown = unmount;
    const opts: SnackbarShowOptions = {
      message: 'Task deleted',
      onCommit: vi.fn(),
      onUndo: vi.fn(),
    };
    await act(async () => {
      api.show(opts);
    });
    expect(container.querySelector('.emt-snackbar__message')?.textContent).toBe('Task deleted');
    expect(container.querySelector('button')?.textContent).toBe('Undo');
  });

  it('Undo within 5 s fires onUndo and suppresses onCommit', async () => {
    const { container, api, unmount } = await renderProvider();
    teardown = unmount;

    const onCommit = vi.fn();
    const onUndo = vi.fn();
    await act(async () => {
      api.show({ message: 'Task deleted', onCommit, onUndo });
    });

    // Advance 4 s — still inside the undo window.
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')!.click();
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(container.querySelector('.emt-snackbar')).toBeNull();

    // The originally-scheduled commit must NOT fire after dismissal.
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('Timeout without undo fires onCommit', async () => {
    const { container, api, unmount } = await renderProvider();
    teardown = unmount;

    const onCommit = vi.fn();
    const onUndo = vi.fn();
    await act(async () => {
      api.show({ message: 'Task deleted', onCommit, onUndo });
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(container.querySelector('.emt-snackbar')).toBeNull();
  });

  it('honors a custom duration', async () => {
    const { api, unmount } = await renderProvider();
    teardown = unmount;

    const onCommit = vi.fn();
    await act(async () => {
      api.show({ message: 'Saved', onCommit, duration: 2000 });
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(onCommit).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('superseding show() implicitly commits the previous snackbar', async () => {
    const { container, api, unmount } = await renderProvider();
    teardown = unmount;

    const firstCommit = vi.fn();
    const firstUndo = vi.fn();
    await act(async () => {
      api.show({ message: 'First', onCommit: firstCommit, onUndo: firstUndo });
    });

    const secondCommit = vi.fn();
    await act(async () => {
      api.show({ message: 'Second', onCommit: secondCommit });
    });

    expect(firstCommit).toHaveBeenCalledTimes(1);
    expect(firstUndo).not.toHaveBeenCalled();
    expect(container.querySelector('.emt-snackbar__message')?.textContent).toBe('Second');
    // No Undo button on the second message — onUndo was not provided.
    expect(container.querySelector('button')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(secondCommit).toHaveBeenCalledTimes(1);
  });

  it('dismiss() cancels without firing commit or undo', async () => {
    const { container, api, unmount } = await renderProvider();
    teardown = unmount;

    const onCommit = vi.fn();
    const onUndo = vi.fn();
    await act(async () => {
      api.show({ message: 'x', onCommit, onUndo });
    });
    await act(async () => {
      api.dismiss();
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(container.querySelector('.emt-snackbar')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('pagehide commits a pending undo snackbar', async () => {
    const { api, unmount } = await renderProvider();
    teardown = unmount;

    const onCommit = vi.fn();
    const onUndo = vi.fn();
    await act(async () => {
      api.show({ message: 'Deleted', onCommit, onUndo });
    });
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });
});

describe('Snackbar reduced-motion', () => {
  it('zeroes out .emt-snackbar animation under prefers-reduced-motion', () => {
    const reducedBlock = COMPONENT_CSS.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
    )?.[0];
    expect(reducedBlock).toBeDefined();
    expect(reducedBlock).toContain('.emt-snackbar');
    expect(reducedBlock).toContain('animation: none');
  });
});
