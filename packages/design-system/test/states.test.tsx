/**
 * Skeleton + EmptyNote + ErrorBanner — the standardized loading / empty
 * / error primitives. Component-level tests; the reduced-motion override
 * for `.emt-skeleton` is asserted at the COMPONENT_CSS string level.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COMPONENT_CSS } from '../src/components.ts';
import { EmptyNote } from '../src/EmptyNote.tsx';
import { ErrorBanner } from '../src/ErrorBanner.tsx';
import { Skeleton } from '../src/Skeleton.tsx';

import { renderToContainer } from './render.ts';

describe('Skeleton', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders aria-hidden, decorative <div> with the emt-skeleton class', async () => {
    const { container, unmount } = await renderToContainer(<Skeleton width={120} height={20} />);
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('.emt-skeleton')!;
    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('20px');
  });

  it('treats string width/height as raw CSS', async () => {
    const { container, unmount } = await renderToContainer(<Skeleton width="40%" height="1.5em" />);
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('.emt-skeleton')!;
    expect(el.style.width).toBe('40%');
    expect(el.style.height).toBe('1.5em');
  });

  it('applies the circle variant class', async () => {
    const { container, unmount } = await renderToContainer(<Skeleton variant="circle" />);
    teardown = unmount;
    expect(container.querySelector('.emt-skeleton--circle')).not.toBeNull();
  });

  it('omits width/height styles when not provided', async () => {
    const { container, unmount } = await renderToContainer(<Skeleton />);
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('.emt-skeleton')!;
    expect(el.style.width).toBe('');
    expect(el.style.height).toBe('');
  });

  it('zeroes out shimmer animation under prefers-reduced-motion', () => {
    const reducedBlock = COMPONENT_CSS.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
    )?.[0];
    expect(reducedBlock).toContain('.emt-skeleton');
    expect(reducedBlock).toContain('animation: none');
  });
});

describe('EmptyNote', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders a <p> with emt-empty-note and forwards children', async () => {
    const { container, unmount } = await renderToContainer(
      <EmptyNote>Nothing scheduled</EmptyNote>,
    );
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('.emt-empty-note')!;
    expect(el.tagName).toBe('P');
    expect(el.textContent).toBe('Nothing scheduled');
  });

  it('preserves a caller className alongside the default', async () => {
    const { container, unmount } = await renderToContainer(
      <EmptyNote className="extra">x</EmptyNote>,
    );
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('.emt-empty-note')!;
    expect(el.className).toContain('emt-empty-note');
    expect(el.className).toContain('extra');
  });
});

describe('ErrorBanner', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders role="alert" with the message', async () => {
    const { container, unmount } = await renderToContainer(<ErrorBanner message="Sync failed" />);
    teardown = unmount;
    const el = container.querySelector<HTMLElement>('[role="alert"]')!;
    expect(el.className).toContain('emt-error-banner');
    expect(el.querySelector('.emt-error-banner__message')?.textContent).toBe('Sync failed');
    expect(el.querySelector('button')).toBeNull();
  });

  it('renders a Retry button only when onRetry is provided', async () => {
    const onRetry = vi.fn();
    const { container, unmount } = await renderToContainer(
      <ErrorBanner message="Oops" onRetry={onRetry} />,
    );
    teardown = unmount;
    const btn = container.querySelector<HTMLButtonElement>('button')!;
    expect(btn.textContent).toBe('Retry');
    expect(btn.className).toContain('emt-button--tonal');
    btn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('honors a custom retryLabel', async () => {
    const { container, unmount } = await renderToContainer(
      <ErrorBanner message="Oops" onRetry={() => {}} retryLabel="Try again" />,
    );
    teardown = unmount;
    expect(container.querySelector('button')?.textContent).toBe('Try again');
  });
});
