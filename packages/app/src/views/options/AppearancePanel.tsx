/**
 * AppearancePanel — view4 / Appearance group (Step 9.4).
 *
 * Theme is locked to Dark in the v1 release — rendered as a disabled
 * radio so users see the intent. The bulk of the panel is the
 * per-quadrant color override grid: a native `<input type="color">`
 * for each of Q1–Q4, mirroring the design-system tokens; a "Reset"
 * button next to each clears the override and falls back to the
 * design-system default.
 *
 * Writes go through `useAppearanceStore`, which mirrors the value
 * into React state and asynchronously persists to the shared meta
 * store. App.tsx subscribes via `useAppearanceOverrides` and forwards
 * the merged map to `<ThemeProvider colorOverrides={...}>`, so the
 * matrix glow updates immediately without a reload.
 */
import { tokens } from '@emt/design-system';
import type { ReactNode, ChangeEvent } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useAppearanceStore, type QuadrantKey } from '../../state/appearance.js';

const QUADRANT_KEYS: readonly QuadrantKey[] = ['q1', 'q2', 'q3', 'q4'];

const LABEL_KEY: Record<QuadrantKey, StringKey> = {
  q1: 'app.matrix.cell.q1.label',
  q2: 'app.matrix.cell.q2.label',
  q3: 'app.matrix.cell.q3.label',
  q4: 'app.matrix.cell.q4.label',
};

const DEFAULT_COLOR: Record<QuadrantKey, string> = {
  q1: tokens.color.q1,
  q2: tokens.color.q2,
  q3: tokens.color.q3,
  q4: tokens.color.q4,
};

export function AppearancePanel(): ReactNode {
  const t = useT();
  const overrides = useAppearanceStore((s) => s.overrides);
  const setColor = useAppearanceStore((s) => s.setColor);
  const clearColor = useAppearanceStore((s) => s.clearColor);

  const onColorChange = (key: QuadrantKey) => (e: ChangeEvent<HTMLInputElement>) => {
    void setColor(key, e.currentTarget.value);
  };

  const onReset = (key: QuadrantKey) => (): void => {
    void clearColor(key);
  };

  return (
    <div
      className="emt-appearance-panel"
      data-options-panel="appearance"
      data-options-group="appearance"
    >
      <fieldset className="emt-appearance-panel__theme" data-section="theme">
        <legend className="emt-appearance-panel__legend">
          {t('app.options.appearance.theme')}
        </legend>
        <label className="emt-appearance-panel__theme-option">
          <input type="radio" name="theme" value="dark" checked readOnly disabled />
          <span>{t('app.options.appearance.theme.dark')}</span>
        </label>
        <p className="emt-appearance-panel__note">{t('app.options.appearance.theme.locked')}</p>
      </fieldset>
      <fieldset className="emt-appearance-panel__quadrants" data-section="quadrants">
        <legend className="emt-appearance-panel__legend">
          {t('app.options.appearance.quadrants')}
        </legend>
        <ul className="emt-appearance-panel__list">
          {QUADRANT_KEYS.map((key) => {
            const override = overrides[key];
            const value = override ?? DEFAULT_COLOR[key];
            return (
              <li key={key} className="emt-appearance-panel__row" data-quadrant={key}>
                <span className="emt-appearance-panel__name">{t(LABEL_KEY[key])}</span>
                <input
                  type="color"
                  className="emt-appearance-panel__color"
                  data-field={`color-${key}`}
                  value={value}
                  onChange={onColorChange(key)}
                  aria-label={t(LABEL_KEY[key])}
                />
                <button
                  type="button"
                  className="emt-appearance-panel__reset"
                  data-action={`reset-${key}`}
                  onClick={onReset(key)}
                  disabled={override === undefined}
                >
                  {t('app.options.appearance.reset')}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
