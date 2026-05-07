/**
 * view1 — Eisenhower matrix shell.
 *
 * Renders the 2 × 2 quadrant grid (Step 5.1). Step 5.3 fills each
 * cell with its task list; Step 5.5 turns the view into a dnd-kit
 * `DndContext`.
 *
 * Spatial layout matches `design-input.md`: importance increases
 * upward, urgency increases rightward, so Q1 (Do) sits in the
 * top-right and Q4 (Delete) sits in the bottom-left.
 */
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';

import './matrix.css';
import { MatrixCell } from './MatrixCell.js';

export function MatrixView(): ReactNode {
  const t = useT();
  return (
    <main data-view="matrix" className="emt-matrix" aria-label={t('app.matrix.heading')}>
      <div className="emt-matrix__grid">
        <MatrixCell quadrant="Q2" />
        <MatrixCell quadrant="Q1" />
        <MatrixCell quadrant="Q4" />
        <MatrixCell quadrant="Q3" />
      </div>
      <span className="emt-matrix__axis emt-matrix__axis--important" aria-hidden="true">
        {t('app.matrix.axis.important')} ↑
      </span>
      <span className="emt-matrix__axis emt-matrix__axis--urgent" aria-hidden="true">
        {t('app.matrix.axis.urgent')} →
      </span>
    </main>
  );
}
