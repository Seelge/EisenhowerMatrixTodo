/**
 * Integration test: ThemeProvider must inject the design tokens as CSS
 * variables on the wrapping element so descendants can read them, and must
 * apply the reset stylesheet (with `color-scheme: dark` baked in) globally.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../src/ThemeProvider.tsx';
import { tokens } from '../src/tokens.ts';

import { renderToContainer } from './render.ts';

describe('ThemeProvider', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('exposes --color-bg to descendants via CSS custom properties', async () => {
    const { container, unmount } = await renderToContainer(
      <ThemeProvider>
        <span data-testid="probe">probe</span>
      </ThemeProvider>,
    );
    teardown = unmount;

    const wrapper = container.querySelector<HTMLElement>('[data-emt-theme="dark"]');
    const probe = container.querySelector<HTMLElement>('[data-testid="probe"]');
    expect(wrapper).not.toBeNull();
    expect(probe).not.toBeNull();

    // The wrapper carries the CSS variable as inline style; descendants
    // inherit it via the cascade.
    expect(wrapper!.style.getPropertyValue('--color-bg')).toBe(tokens.color.bg);
    expect(wrapper!.style.getPropertyValue('color-scheme')).toBe('dark');
    expect(wrapper!.style.getPropertyValue('--color-q1')).toBe(tokens.color.q1);
    expect(wrapper!.style.getPropertyValue('--color-q2')).toBe(tokens.color.q2);
    expect(wrapper!.style.getPropertyValue('--color-q3')).toBe(tokens.color.q3);
    expect(wrapper!.style.getPropertyValue('--color-q4')).toBe(tokens.color.q4);
    // Glow shorthand survives commas inside rgba() — guards against naive
    // parsing of multi-segment box-shadow values.
    expect(wrapper!.style.getPropertyValue('--glow-q2')).toBe(tokens.glow.q2);
  });

  it('mounts a single reset <style> tag globally and removes it on unmount', async () => {
    const before = document.querySelectorAll('style#emt-theme-reset').length;
    expect(before).toBe(0);

    const first = await renderToContainer(<ThemeProvider>a</ThemeProvider>);
    const second = await renderToContainer(<ThemeProvider>b</ThemeProvider>);

    const styleNodes = document.querySelectorAll('style#emt-theme-reset');
    expect(styleNodes.length).toBe(1);
    expect(styleNodes[0]?.textContent).toMatch(/box-sizing: border-box/);
    // Components layer is injected alongside the reset.
    expect(styleNodes[0]?.textContent).toMatch(/\.emt-button/);
    expect(styleNodes[0]?.textContent).toMatch(/\.emt-fab/);

    first.unmount();
    expect(document.querySelectorAll('style#emt-theme-reset').length).toBe(1);
    second.unmount();
    expect(document.querySelectorAll('style#emt-theme-reset').length).toBe(0);
  });
});
