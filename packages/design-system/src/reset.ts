/**
 * Reset CSS as a string constant for runtime injection by `<ThemeProvider>`.
 *
 * The canonical source is `reset.css`; this constant must be kept identical.
 * `test/reset.test.ts` enforces that with a byte-comparison drift check so
 * neither path can silently fall behind.
 */
export const RESET_CSS = `/*
 * Minimal CSS reset for the design system.
 *
 * Mirrored verbatim by the RESET_CSS constant in \`reset.ts\`; a drift test
 * (\`test/reset.test.ts\`) asserts the two are byte-identical so that the
 * runtime ThemeProvider injection and bundler-side @import paths agree.
 */

*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
  padding: 0;
}

html,
body,
#root {
  height: 100%;
}

body {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
  color: inherit;
}

button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: none;
}

ul,
ol {
  list-style: none;
}

p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
`;
