/**
 * Tiny render helper, mirrors the one in @emt/design-system tests. Mounts
 * a React tree onto a fresh DOM container and returns a synchronous
 * unmount handle.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export interface RenderHandle {
  container: HTMLElement;
  unmount: () => void;
}

export async function renderToContainer(node: React.ReactNode): Promise<RenderHandle> {
  const container = document.createElement('div');
  document.body.append(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      root?.unmount();
      container.remove();
    },
  };
}
