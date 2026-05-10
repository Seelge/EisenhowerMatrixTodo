import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import {
  quadrantLayoutId,
  taskLayoutId,
  ZoomController,
} from '../src/views/zoom/ZoomController.tsx';

describe('ZoomController — Step 7.1 snap morph shell', () => {
  it('marks the active zoom surface for matrix and focused quadrant states', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <ZoomController state={{ zoom: 'matrix' }}>
            <main data-view="matrix" />
          </ZoomController>,
        );
      });

      const matrixScene = findZoomScene(container, 'matrix');
      expect(matrixScene).not.toBeUndefined();
      expect(matrixScene?.dataset['focusedQuadrant']).toBeUndefined();
      expect(container.querySelector('[data-view="matrix"]')).not.toBeNull();

      await act(async () => {
        root.render(
          <ZoomController state={{ zoom: 'quadrant', focusedQuadrant: 'Q1' }}>
            <main data-view="quadrant" data-quadrant="Q1" />
          </ZoomController>,
        );
      });

      const quadrantScene = findZoomScene(container, 'quadrant');
      expect(quadrantScene).not.toBeUndefined();
      expect(quadrantScene?.dataset['focusedQuadrant']).toBe('Q1');
      expect(container.querySelector('[data-view="quadrant"]')?.getAttribute('data-quadrant')).toBe(
        'Q1',
      );
    } finally {
      cleanup(root, container);
    }
  });

  it('uses stable shared layout ids for quadrants and task cards', () => {
    expect(quadrantLayoutId('Q3')).toBe('emt-quadrant-Q3');
    expect(taskLayoutId('local', 'task-123')).toBe('emt-task-local-task-123');
  });
});

function cleanup(root: Root, container: HTMLElement): void {
  root.unmount();
  container.remove();
}

function findZoomScene(
  container: HTMLElement,
  zoom: 'matrix' | 'quadrant',
): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>('.emt-zoom__scene')).find(
    (scene) => scene.dataset['zoom'] === zoom,
  );
}
