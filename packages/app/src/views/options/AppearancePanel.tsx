/**
 * AppearancePanel — view4 / Appearance group (Step 9.4 / Phase 22).
 *
 * Theme: Dark (default) or Light. Light uses AA-tuned surfaces and
 * deeper quadrant hues. Per-quadrant color overrides still apply on
 * top of the active scheme defaults.
 *
 * Writes go through `useAppearanceStore`. App.tsx forwards scheme +
 * overrides to `<ThemeProvider>`.
 */
import { colorsForScheme, type ColorScheme } from '@emt/design-system';
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

export function AppearancePanel(): ReactNode {
  const t = useT();
  const scheme = useAppearanceStore((s) => s.scheme);
  const overrides = useAppearanceStore((s) => s.overrides);
  const setScheme = useAppearanceStore((s) => s.setScheme);
  const setColor = useAppearanceStore((s) => s.setColor);
  const clearColor = useAppearanceStore((s) => s.clearColor);
  const defaults = colorsForScheme(scheme);

  const onColorChange = (key: QuadrantKey) => (e: ChangeEvent<HTMLInputElement>) => {
    void setColor(key, e.currentTarget.value);
  };

  const onReset = (key: QuadrantKey) => (): void => {
    void clearColor(key);
  };

  const onThemeChange = (next: ColorScheme) => (): void => {
    void setScheme(next);
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
          <input
            type="radio"
            name="theme"
            value="dark"
            data-field="theme-dark"
            checked={scheme === 'dark'}
            onChange={onThemeChange('dark')}
          />
          <span>{t('app.options.appearance.theme.dark')}</span>
        </label>
        <label className="emt-appearance-panel__theme-option">
          <input
            type="radio"
            name="theme"
            value="light"
            data-field="theme-light"
            checked={scheme === 'light'}
            onChange={onThemeChange('light')}
          />
          <span>{t('app.options.appearance.theme.light')}</span>
        </label>
        <p className="emt-appearance-panel__note">{t('app.options.appearance.theme.hint')}</p>
      </fieldset>
      <fieldset className="emt-appearance-panel__quadrants" data-section="quadrants">
        <legend className="emt-appearance-panel__legend">
          {t('app.options.appearance.quadrants')}
        </legend>
        <ul className="emt-appearance-panel__list">
          {QUADRANT_KEYS.map((key) => {
            const override = overrides[key];
            const value = override ?? defaults[key];
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
