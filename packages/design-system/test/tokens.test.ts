import { describe, expect, it } from 'vitest';

import { tokens } from '../src/tokens.ts';

describe('design-system tokens', () => {
  it('palette includes all four quadrant colors', () => {
    expect(tokens.color.q1).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens.color.q2).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens.color.q3).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens.color.q4).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('every quadrant has a matching glow', () => {
    // Derive the expected `rgba(r, g, b` prefix from each colour token
    // so a palette refresh (e.g. Step 12.10) only needs to update the
    // tokens themselves, not the test pins.
    const hexToRgbPrefix = (hex: string): string => {
      const [r, g, b] = hex
        .replace('#', '')
        .match(/.{2}/g)!
        .map((h) => Number.parseInt(h, 16));
      return `rgba(${r}, ${g}, ${b}`;
    };
    expect(tokens.glow.q1).toContain(hexToRgbPrefix(tokens.color.q1));
    expect(tokens.glow.q2).toContain(hexToRgbPrefix(tokens.color.q2));
    expect(tokens.glow.q3).toContain(hexToRgbPrefix(tokens.color.q3));
    expect(tokens.glow.q4).toContain(hexToRgbPrefix(tokens.color.q4));
    expect(tokens.glow.accent).toContain(hexToRgbPrefix(tokens.color.accent));
  });

  it('space scale is monotonically increasing', () => {
    const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
    const px = order.map((k) => Number.parseInt(tokens.space[k], 10));
    for (let i = 1; i < px.length; i++) {
      expect(px[i]).toBeGreaterThan(px[i - 1] ?? 0);
    }
  });

  it('motion durations are monotonically increasing', () => {
    const short = Number.parseInt(tokens.motion.duration.short, 10);
    const medium = Number.parseInt(tokens.motion.duration.medium, 10);
    const long = Number.parseInt(tokens.motion.duration.long, 10);
    expect(medium).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(medium);
  });
});
