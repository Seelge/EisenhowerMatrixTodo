import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';

// Step 12.7 — keep Chrome's on-screen keyboard on the resize path (it
// shrinks the viewport) rather than overlaying content. This pairs
// with `interactive-widget=resizes-content` in `index.html`; together
// they keep the QuickComposer sheet clear of the keyboard. Guarded —
// the VirtualKeyboard API is Chromium-only.
const virtualKeyboard = (
  navigator as Navigator & { virtualKeyboard?: { overlaysContent: boolean } }
).virtualKeyboard;
if (virtualKeyboard !== undefined) {
  virtualKeyboard.overlaysContent = false;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
