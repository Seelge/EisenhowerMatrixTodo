import { describe, expect, it } from 'vitest';

import { tokens } from '../src/tokens.ts';

describe('design-system tokens', () => {
  it('palette includes all four quadrant colors', () => {
    expect(tokens.color.q1).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens.color.q2).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens.color.q3).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens.color.q4).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('every quadrant neon border colour matches its palette colour', () => {
    expect(tokens.glow.q1.toLowerCase()).toBe(tokens.color.q1.toLowerCase());
    expect(tokens.glow.q2.toLowerCase()).toBe(tokens.color.q2.toLowerCase());
    expect(tokens.glow.q3.toLowerCase()).toBe(tokens.color.q3.toLowerCase());
    expect(tokens.glow.q4.toLowerCase()).toBe(tokens.color.q4.toLowerCase());
    expect(tokens.glow.accent.toLowerCase()).toBe(tokens.color.accent.toLowerCase());
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
