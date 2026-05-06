/**
 * Component + a11y tests for Button, IconButton, Fab, Card.
 *
 * Asserts:
 *   - All button-family components render with implicit role="button"
 *     and a default `type="button"` (no accidental form submits).
 *   - `Button` applies `emt-button--{variant}` for filled/tonal/outlined/text.
 *   - Click handlers fire; disabled buttons block them.
 *   - Focus management: `.focus()` lands on the underlying button (which
 *     picks up the global `:focus-visible` ring from the reset).
 *   - `aria-label` on `IconButton` and `Fab` is forwarded to the DOM
 *     (the type system makes it required at the call site).
 *   - `Card` is a plain `<div>` with `emt-card`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../src/Button.tsx';
import { Card } from '../src/Card.tsx';
import { Fab } from '../src/Fab.tsx';
import { IconButton } from '../src/IconButton.tsx';

import { renderToContainer } from './render.ts';

describe('Button', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders as <button type="button"> with the filled variant by default', async () => {
    const { container, unmount } = await renderToContainer(<Button>Save</Button>);
    teardown = unmount;
    const btn = container.querySelector('button')!;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.className).toContain('emt-button');
    expect(btn.className).toContain('emt-button--filled');
    expect(btn.textContent).toBe('Save');
  });

  for (const variant of ['filled', 'tonal', 'outlined', 'text'] as const) {
    it(`applies the ${variant} variant class`, async () => {
      const { container, unmount } = await renderToContainer(<Button variant={variant}>x</Button>);
      teardown = unmount;
      const btn = container.querySelector('button')!;
      expect(btn.className).toContain(`emt-button--${variant}`);
    });
  }

  it('fires onClick and is focusable', async () => {
    const handler = vi.fn();
    const { container, unmount } = await renderToContainer(<Button onClick={handler}>Go</Button>);
    teardown = unmount;
    const btn = container.querySelector<HTMLButtonElement>('button')!;
    btn.focus();
    expect(document.activeElement).toBe(btn);
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', async () => {
    const handler = vi.fn();
    const { container, unmount } = await renderToContainer(
      <Button onClick={handler} disabled>
        Go
      </Button>,
    );
    teardown = unmount;
    const btn = container.querySelector<HTMLButtonElement>('button')!;
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps a caller-supplied type (e.g., submit)', async () => {
    const { container, unmount } = await renderToContainer(<Button type="submit">Submit</Button>);
    teardown = unmount;
    expect(container.querySelector('button')!.getAttribute('type')).toBe('submit');
  });

  it('preserves a caller className alongside the variant class', async () => {
    const { container, unmount } = await renderToContainer(<Button className="extra">Go</Button>);
    teardown = unmount;
    const cls = container.querySelector('button')!.className;
    expect(cls).toContain('emt-button--filled');
    expect(cls).toContain('extra');
  });
});

describe('IconButton', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('forwards the required aria-label and applies the icon-button class', async () => {
    const { container, unmount } = await renderToContainer(
      <IconButton aria-label="Close">×</IconButton>,
    );
    teardown = unmount;
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-label')).toBe('Close');
    expect(btn.className).toContain('emt-icon-button');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('is focusable and clickable', async () => {
    const handler = vi.fn();
    const { container, unmount } = await renderToContainer(
      <IconButton aria-label="Add" onClick={handler}>
        +
      </IconButton>,
    );
    teardown = unmount;
    const btn = container.querySelector<HTMLButtonElement>('button')!;
    btn.focus();
    expect(document.activeElement).toBe(btn);
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Fab', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders as <button> with the fab class and the required aria-label', async () => {
    const { container, unmount } = await renderToContainer(<Fab aria-label="New task">+</Fab>);
    teardown = unmount;
    const btn = container.querySelector('button')!;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.className).toContain('emt-fab');
    expect(btn.getAttribute('aria-label')).toBe('New task');
    expect(btn.getAttribute('type')).toBe('button');
  });
});

describe('Card', () => {
  let teardown: (() => void) | undefined;
  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders as a div with the emt-card class and forwards children', async () => {
    const { container, unmount } = await renderToContainer(
      <Card>
        <span data-testid="probe">probe</span>
      </Card>,
    );
    teardown = unmount;
    const card = container.querySelector('.emt-card')!;
    expect(card.tagName).toBe('DIV');
    expect(card.querySelector('[data-testid="probe"]')?.textContent).toBe('probe');
  });

  it('preserves a caller className alongside the default', async () => {
    const { container, unmount } = await renderToContainer(<Card className="task-row">x</Card>);
    teardown = unmount;
    const card = container.querySelector<HTMLElement>('.emt-card')!;
    expect(card.className).toContain('emt-card');
    expect(card.className).toContain('task-row');
  });
});
