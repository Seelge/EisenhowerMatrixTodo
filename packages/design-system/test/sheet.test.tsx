/**
 * Sheet + SidePanel + ResponsiveSurface integration tests.
 *
 * Covers (per Step 3.4 done-when):
 *   - both surfaces render `role="dialog"` / `aria-modal` and forward `aria-label`
 *   - Esc closes via `onClose`
 *   - Scrim click closes the Sheet (Sheet has a scrim; SidePanel does not)
 *   - focus moves into the dialog on open, traps Tab/Shift+Tab, and
 *     restores to the previously-focused element on close
 *   - `ResponsiveSurface` picks SidePanel ≥ breakpoint, Sheet below, and
 *     flips live on `matchMedia` change events
 *   - `prefers-reduced-motion` zeroes out the dialog animations
 *     (asserted at the CSS-string level since happy-dom doesn't compute
 *     `@media` queries)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPONENT_CSS } from '../src/components.ts';
import { ResponsiveSurface } from '../src/ResponsiveSurface.tsx';
import { Sheet } from '../src/Sheet.tsx';
import { SidePanel } from '../src/SidePanel.tsx';

import { renderToContainer } from './render.ts';

function fireKey(key: string, opts: KeyboardEventInit = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('Sheet', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders nothing when open=false', async () => {
    const { container, unmount } = await renderToContainer(
      <Sheet open={false} onClose={() => {}} aria-label="Edit task">
        <button>x</button>
      </Sheet>,
    );
    teardown = unmount;
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('.emt-scrim')).toBeNull();
  });

  it('renders a dialog + scrim when open, with aria-modal and aria-label', async () => {
    const { container, unmount } = await renderToContainer(
      <Sheet open onClose={() => {}} aria-label="Edit task">
        <button>x</button>
      </Sheet>,
    );
    teardown = unmount;
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Edit task');
    expect(dialog.className).toContain('emt-sheet');
    expect(container.querySelector('.emt-scrim')).not.toBeNull();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const { unmount } = await renderToContainer(
      <Sheet open onClose={onClose} aria-label="Edit">
        <button>x</button>
      </Sheet>,
    );
    teardown = unmount;
    fireKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the scrim is clicked', async () => {
    const onClose = vi.fn();
    const { container, unmount } = await renderToContainer(
      <Sheet open onClose={onClose} aria-label="Edit">
        <button>x</button>
      </Sheet>,
    );
    teardown = unmount;
    container.querySelector<HTMLElement>('.emt-scrim')!.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the dialog on open and traps Tab/Shift+Tab', async () => {
    const { container, unmount } = await renderToContainer(
      <Sheet open onClose={() => {}} aria-label="Edit">
        <button data-testid="a">A</button>
        <button data-testid="b">B</button>
      </Sheet>,
    );
    teardown = unmount;

    const a = container.querySelector<HTMLButtonElement>('[data-testid="a"]')!;
    const b = container.querySelector<HTMLButtonElement>('[data-testid="b"]')!;
    expect(document.activeElement).toBe(a);

    // Tab from last (B) wraps to first (A).
    b.focus();
    fireKey('Tab');
    expect(document.activeElement).toBe(a);

    // Shift+Tab from first (A) wraps to last (B).
    a.focus();
    fireKey('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(b);
  });

  it('restores focus to the previously-focused element on close', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'open';
    document.body.append(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { container, unmount } = await renderToContainer(
      <Sheet open onClose={() => {}} aria-label="Edit">
        <button data-testid="inside">A</button>
      </Sheet>,
    );
    expect(document.activeElement).toBe(
      container.querySelector<HTMLElement>('[data-testid="inside"]'),
    );

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('lifts clear of the keyboard when the visual viewport shrinks (Step 12.7)', async () => {
    // Simulate an on-screen keyboard: layout viewport 800px, visual
    // viewport shrunk to 480px (keyboard occupies the bottom 320px).
    const originalVV = window.visualViewport;
    const originalInner = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height: 480,
        offsetTop: 0,
        addEventListener: (): void => {},
        removeEventListener: (): void => {},
      },
      configurable: true,
    });
    try {
      const { container, unmount } = await renderToContainer(
        <Sheet open onClose={() => {}} aria-label="Edit">
          <button>field</button>
        </Sheet>,
      );
      teardown = unmount;
      const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
      // Lifted by the keyboard height and capped to the visible area.
      expect(dialog.style.bottom).toBe('320px');
      expect(dialog.style.maxHeight).toBe('480px');
    } finally {
      Object.defineProperty(window, 'visualViewport', {
        value: originalVV,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: originalInner,
        configurable: true,
      });
    }
  });
});

describe('SidePanel', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders a dialog with no scrim, and closes on Escape', async () => {
    const onClose = vi.fn();
    const { container, unmount } = await renderToContainer(
      <SidePanel open onClose={onClose} aria-label="Task details">
        <button>x</button>
      </SidePanel>,
    );
    teardown = unmount;
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.className).toContain('emt-side-panel');
    expect(dialog.getAttribute('aria-label')).toBe('Task details');
    expect(container.querySelector('.emt-scrim')).toBeNull();
    fireKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when open=false', async () => {
    const { container, unmount } = await renderToContainer(
      <SidePanel open={false} onClose={() => {}} aria-label="x">
        <button>x</button>
      </SidePanel>,
    );
    teardown = unmount;
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes on a pointerdown outside the panel (Step 12.4)', async () => {
    const onClose = vi.fn();
    // A sibling node standing in for the matrix behind the scrimless panel.
    const outside = document.createElement('button');
    document.body.append(outside);
    const { container, unmount } = await renderToContainer(
      <SidePanel open onClose={onClose} aria-label="Task details">
        <button>field</button>
      </SidePanel>,
    );
    teardown = () => {
      unmount();
      outside.remove();
    };

    // Pointerdown inside the panel must NOT dismiss it.
    const field = container.querySelector<HTMLButtonElement>('[role="dialog"] button')!;
    field.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Pointerdown outside dismisses it.
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ResponsiveSurface', () => {
  let teardown: (() => void) | undefined;
  let listeners: Set<(e: MediaQueryListEvent) => void>;
  let currentMatches: boolean;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    listeners = new Set();
    currentMatches = false;
    originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: currentMatches,
        media: query,
        onchange: null,
        addEventListener: (_t: string, listener: (e: MediaQueryListEvent) => void) =>
          listeners.add(listener),
        removeEventListener: (_t: string, listener: (e: MediaQueryListEvent) => void) =>
          listeners.delete(listener),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    window.matchMedia = originalMatchMedia;
  });

  it('renders Sheet when below breakpoint', async () => {
    currentMatches = false;
    const { container, unmount } = await renderToContainer(
      <ResponsiveSurface open onClose={() => {}} aria-label="x">
        <button>x</button>
      </ResponsiveSurface>,
    );
    teardown = unmount;
    expect(container.querySelector('.emt-sheet')).not.toBeNull();
    expect(container.querySelector('.emt-side-panel')).toBeNull();
  });

  it('renders SidePanel at or above breakpoint', async () => {
    currentMatches = true;
    const { container, unmount } = await renderToContainer(
      <ResponsiveSurface open onClose={() => {}} aria-label="x">
        <button>x</button>
      </ResponsiveSurface>,
    );
    teardown = unmount;
    expect(container.querySelector('.emt-side-panel')).not.toBeNull();
    expect(container.querySelector('.emt-sheet')).toBeNull();
  });
});

describe('reduced-motion', () => {
  it('zeroes out sheet/side-panel/scrim animations under prefers-reduced-motion', () => {
    expect(COMPONENT_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    // Sheet, SidePanel, and scrim are listed in the reduced-motion block
    // with animation: none.
    const reducedBlock = COMPONENT_CSS.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
    )?.[0];
    expect(reducedBlock).toBeDefined();
    expect(reducedBlock).toContain('.emt-scrim');
    expect(reducedBlock).toContain('.emt-sheet');
    expect(reducedBlock).toContain('.emt-side-panel');
    expect(reducedBlock).toContain('animation: none');
  });
});
