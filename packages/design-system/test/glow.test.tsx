/**
 * Component tests for the Glow primitive.
 *
  * Covers the four quadrant colors and the accent variant, asserting:
  *   - the inline `border` references the matching CSS variable
  *     (thin neon line; themes re-skin at runtime)
  *   - `data-emt-glow` mirrors the color (selector hook for view1 cells)
  *   - children render through
  *   - consumer styles win over the defaults (override of border-radius)
  */
import { afterEach, describe, expect, it } from 'vitest';

import { Glow, type GlowColor } from '../src/Glow.tsx';

import { renderToContainer } from './render.ts';

const COLORS: readonly GlowColor[] = ['q1', 'q2', 'q3', 'q4', 'accent'];

describe('Glow', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  for (const color of COLORS) {
    it(`renders the ${color} frame as a 1px neon CSS-var border`, async () => {
      const { container, unmount } = await renderToContainer(
        <Glow color={color}>
          <span data-testid="probe">probe</span>
        </Glow>,
      );
      teardown = unmount;

      const node = container.querySelector<HTMLElement>(`[data-emt-glow="${color}"]`);
      expect(node).not.toBeNull();
      expect(node!.style.borderWidth).toBe('1px');
      expect(node!.style.borderStyle).toBe('solid');
      expect(node!.style.borderColor).toBe(`var(--glow-${color})`);
      expect(node!.style.boxShadow).toBe('none');
      expect(node!.style.borderRadius).toBe('var(--radius-md)');
      expect(node!.querySelector('[data-testid="probe"]')?.textContent).toBe('probe');
    });
  }

  it('lets consumer styles override the defaults', async () => {
    const { container, unmount } = await renderToContainer(
      <Glow color="q1" style={{ borderRadius: '0px', padding: '12px' }} />,
    );
    teardown = unmount;

    const node = container.querySelector<HTMLElement>('[data-emt-glow="q1"]')!;
    expect(node.style.borderColor).toBe('var(--glow-q1)');
    expect(node.style.borderRadius).toBe('0px');
    expect(node.style.padding).toBe('12px');
  });

  it('forwards arbitrary div props (className, aria-*)', async () => {
    const { container, unmount } = await renderToContainer(
      <Glow color="q3" className="cell" aria-label="Delegate quadrant" />,
    );
    teardown = unmount;

    const node = container.querySelector<HTMLElement>('[data-emt-glow="q3"]')!;
    expect(node.className).toBe('cell');
    expect(node.getAttribute('aria-label')).toBe('Delegate quadrant');
  });
});
