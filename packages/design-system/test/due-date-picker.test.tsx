/**
 * DueDatePicker — component tests.
 *
 * Each preset has a case (Today, Tomorrow, This weekend, Next week, No
 * date) plus the native `<input type="date">` change path and the
 * highlighting of the selected preset.
 */
import { useState, type ReactNode } from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DueDatePicker } from '../src/DueDatePicker.tsx';

import { renderToContainer } from './render.ts';

// Wednesday 2026-05-06 — matches the helper test fixtures.
const TODAY = new Date(2026, 4, 6);

function Host({
  initial = null,
  spy,
}: {
  initial?: string | null;
  spy?: (next: string | null) => void;
}): ReactNode {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <DueDatePicker
      value={value}
      onChange={(next) => {
        spy?.(next);
        setValue(next);
      }}
      today={TODAY}
      locale="de-DE"
    />
  );
}

function clickPreset(container: HTMLElement, key: string): HTMLButtonElement {
  const btn = container.querySelector<HTMLButtonElement>(`[data-emt-preset="${key}"]`)!;
  btn.click();
  return btn;
}

describe('DueDatePicker presets', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('Today preset → 2026-05-06', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host spy={spy} />);
    teardown = unmount;
    await act(async () => {
      clickPreset(container, 'today');
    });
    expect(spy).toHaveBeenCalledWith('2026-05-06');
  });

  it('Tomorrow preset → 2026-05-07', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host spy={spy} />);
    teardown = unmount;
    await act(async () => {
      clickPreset(container, 'tomorrow');
    });
    expect(spy).toHaveBeenCalledWith('2026-05-07');
  });

  it('This weekend preset (Wed → upcoming Sat) → 2026-05-09', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host spy={spy} />);
    teardown = unmount;
    await act(async () => {
      clickPreset(container, 'weekend');
    });
    expect(spy).toHaveBeenCalledWith('2026-05-09');
  });

  it('Next week preset (de-DE Mon-first, Wed → upcoming Mon) → 2026-05-11', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host spy={spy} />);
    teardown = unmount;
    await act(async () => {
      clickPreset(container, 'next-week');
    });
    expect(spy).toHaveBeenCalledWith('2026-05-11');
  });

  it('No date preset → null', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host initial="2026-05-09" spy={spy} />);
    teardown = unmount;
    await act(async () => {
      clickPreset(container, 'none');
    });
    expect(spy).toHaveBeenCalledWith(null);
  });
});

describe('DueDatePicker selection highlight', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('marks the matching preset aria-pressed and renders it as the filled variant', async () => {
    const { container, unmount } = await renderToContainer(<Host initial="2026-05-06" />);
    teardown = unmount;

    const today = container.querySelector<HTMLButtonElement>('[data-emt-preset="today"]')!;
    const tomorrow = container.querySelector<HTMLButtonElement>('[data-emt-preset="tomorrow"]')!;
    expect(today.getAttribute('aria-pressed')).toBe('true');
    expect(today.className).toContain('emt-button--filled');
    expect(tomorrow.getAttribute('aria-pressed')).toBe('false');
    expect(tomorrow.className).toContain('emt-button--tonal');
  });

  it('flips the filled variant when selection moves to a new preset', async () => {
    const { container, unmount } = await renderToContainer(<Host initial="2026-05-06" />);
    teardown = unmount;

    await act(async () => {
      clickPreset(container, 'tomorrow');
    });
    const today = container.querySelector<HTMLButtonElement>('[data-emt-preset="today"]')!;
    const tomorrow = container.querySelector<HTMLButtonElement>('[data-emt-preset="tomorrow"]')!;
    expect(today.className).toContain('emt-button--tonal');
    expect(tomorrow.className).toContain('emt-button--filled');
  });
});

describe('DueDatePicker native input', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('mirrors `value` into the input', async () => {
    const { container, unmount } = await renderToContainer(<Host initial="2026-05-09" />);
    teardown = unmount;
    const input = container.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(input.value).toBe('2026-05-09');
  });

  it('emits the input value on change, and null when cleared', async () => {
    const spy = vi.fn();
    const { container, unmount } = await renderToContainer(<Host spy={spy} />);
    teardown = unmount;
    const input = container.querySelector<HTMLInputElement>('input[type="date"]')!;

    // React 18 detects "value changed" by patching the value setter on
    // HTMLInputElement.prototype; assigning `input.value = …` directly
    // bypasses that and the onChange handler stays silent. Go through
    // the native setter as @testing-library/react does internally.
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;

    await act(async () => {
      nativeSetter.call(input, '2026-12-25');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(spy).toHaveBeenCalledWith('2026-12-25');

    await act(async () => {
      nativeSetter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(spy).toHaveBeenCalledWith(null);
  });
});
