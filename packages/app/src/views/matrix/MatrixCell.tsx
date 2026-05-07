/**
 * Single-quadrant cell rendered inside `MatrixView`'s 2 × 2 grid.
 *
 * The frame is the design-system `Glow` primitive in the matching
 * quadrant color (Step 3.2). The Glow's `data-emt-glow` attribute is
 * what tests assert against to verify the palette is correctly mapped.
 *
 * Step 5.1 only renders the labelled frame; the per-cell task list
 * lands in Step 5.3 and reads `useTasks(quadrant)`.
 */
import type { Quadrant } from '@emt/backend-core';
import { Glow, type GlowColor } from '@emt/design-system';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';

const GLOW_COLOR: Record<Quadrant, GlowColor> = {
  Q1: 'q1',
  Q2: 'q2',
  Q3: 'q3',
  Q4: 'q4',
};

const LABEL_KEY: Record<Quadrant, StringKey> = {
  Q1: 'app.matrix.cell.q1.label',
  Q2: 'app.matrix.cell.q2.label',
  Q3: 'app.matrix.cell.q3.label',
  Q4: 'app.matrix.cell.q4.label',
};

export interface MatrixCellProps {
  quadrant: Quadrant;
}

export function MatrixCell({ quadrant }: MatrixCellProps): ReactNode {
  const t = useT();
  const label = t(LABEL_KEY[quadrant]);
  return (
    <Glow
      color={GLOW_COLOR[quadrant]}
      className="emt-matrix__cell"
      data-quadrant={quadrant}
      role="region"
      aria-label={label}
    >
      <header className="emt-matrix__cell-header">
        <h2 className="emt-matrix__cell-title">{label}</h2>
      </header>
    </Glow>
  );
}
