/**
 * QuadrantPicker — selection change + keyboard navigation.
 *
 * Done-when criterion (Step 3.6) is the two behaviors below; the
 * remaining cases assert ARIA wiring (radiogroup, radio, aria-checked,
 * the rovinng tabindex), the spatial layout, and the per-quadrant glow
 * class hooks (`emt-quadrant-picker__cell--{q1..q4}`).
 *
 * Uses a stateful host so onChange feeds back into `value`, mirroring
 * how callers actually drive the picker (it's a controlled component).
 */
import { useState, type ReactNode } from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuadrantPicker } from '../src/QuadrantPicker.tsx';
import type { Quadrant } from '../src/tokens.ts';

import { renderToContainer } from './render.ts';

function Host({
  initial,
  onChangeSpy,
}: {
  initial: Quadrant;
  onChangeSpy?: (q: Quadrant) => void;
}): ReactNode {
  const [value, setValue] = useState<Quadrant>(initial);
  return (
    <QuadrantPicker
      value={value}
      onChange={(q) => {
        onChangeSpy?.(q);
        setValue(q);
      }}
    />
  );
}

function fireKeyOn(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('QuadrantPicker', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders a radiogroup with four radios labeled Schedule/Do/Delete/Delegate', async () => {
    const { container, unmount } = await renderToContainer(<Host initial="q2" />);
    teardown = unmount;
    const group = container.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-label')).toBe('Quadrant');
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(4);
    const labels = Array.from(radios).map((r) => r.textContent);
    // Tab order is q2, q1, q4, q3 (visual reading order: TL, TR, BL, BR).
    expect(labels).toEqual(['Schedule', 'Do', 'Delete', 'Delegate']);
  });

  it('marks only the selected radio aria-checked and gives it the rovinng tabindex', async () => {
    const { container, unmount } = await renderToContainer(<Host initial="q1" />);
    teardown = unmount;
    const radios = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked.length).toBe(1);
    expect(checked[0]?.getAttribute('data-emt-quadrant')).toBe('q1');
    expect(checked[0]?.tabIndex).toBe(0);
    radios
      .filter((r) => r.getAttribute('aria-checked') !== 'true')
      .forEach((r) => expect(r.tabIndex).toBe(-1));
  });

  it('changes selection when a radio is clicked', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q2" onChangeSpy={spy} />);
    teardown = unmount;

    const target = container.querySelector<HTMLButtonElement>('[data-emt-quadrant="q3"]')!;
    await act(async () => {
      target.click();
    });
    expect(spy).toHaveBeenCalledWith('q3');
    // The picker re-renders with the new selection committed.
    expect(target.getAttribute('aria-checked')).toBe('true');
  });

  it('arrow keys navigate spatially: ArrowRight from q2 (TL) → q1 (TR)', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q2" onChangeSpy={spy} />);
    teardown = unmount;
    const group = container.querySelector<HTMLElement>('[role="radiogroup"]')!;
    await act(async () => {
      fireKeyOn(group, 'ArrowRight');
    });
    expect(spy).toHaveBeenCalledWith('q1');
  });

  it('ArrowDown from q2 (TL) → q4 (BL)', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q2" onChangeSpy={spy} />);
    teardown = unmount;
    await act(async () => {
      fireKeyOn(container.querySelector<HTMLElement>('[role="radiogroup"]')!, 'ArrowDown');
    });
    expect(spy).toHaveBeenCalledWith('q4');
  });

  it('ArrowLeft from q1 (TR) → q2 (TL)', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q1" onChangeSpy={spy} />);
    teardown = unmount;
    await act(async () => {
      fireKeyOn(container.querySelector<HTMLElement>('[role="radiogroup"]')!, 'ArrowLeft');
    });
    expect(spy).toHaveBeenCalledWith('q2');
  });

  it('ArrowUp from q3 (BR) → q1 (TR)', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q3" onChangeSpy={spy} />);
    teardown = unmount;
    await act(async () => {
      fireKeyOn(container.querySelector<HTMLElement>('[role="radiogroup"]')!, 'ArrowUp');
    });
    expect(spy).toHaveBeenCalledWith('q1');
  });

  it('arrows clamp at grid boundary: ArrowRight from q1 (TR) is a no-op', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q1" onChangeSpy={spy} />);
    teardown = unmount;
    await act(async () => {
      fireKeyOn(container.querySelector<HTMLElement>('[role="radiogroup"]')!, 'ArrowRight');
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('non-arrow keys are ignored (no preventDefault, no onChange)', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="q2" onChangeSpy={spy} />);
    teardown = unmount;
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    container.querySelector<HTMLElement>('[role="radiogroup"]')!.dispatchEvent(event);
    expect(spy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('honors a custom labels map', async () => {
    const { container, unmount } = await renderToContainer(
      <QuadrantPicker
        value="q2"
        onChange={() => {}}
        labels={{ q1: 'Faire', q2: 'Planifier', q3: 'Déléguer', q4: 'Supprimer' }}
      />,
    );
    teardown = unmount;
    const labels = Array.from(container.querySelectorAll('[role="radio"]')).map(
      (r) => r.textContent,
    );
    expect(labels).toEqual(['Planifier', 'Faire', 'Supprimer', 'Déléguer']);
  });

  it('honors a custom aria-label on the radiogroup', async () => {
    const { container, unmount } = await renderToContainer(
      <QuadrantPicker value="q1" onChange={() => {}} aria-label="Move task to" />,
    );
    teardown = unmount;
    expect(container.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe(
      'Move task to',
    );
  });
});
