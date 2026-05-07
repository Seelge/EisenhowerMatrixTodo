import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider, useT } from '../src/i18n/provider.tsx';
import { strings } from '../src/i18n/strings.en.ts';
import { t } from '../src/i18n/t.ts';

import { renderToContainer } from './render.ts';

describe('i18n', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('default t() resolves a known key', () => {
    expect(t('app.matrix.heading')).toBe(strings['app.matrix.heading']);
    expect(t('app.error.fallback.retry')).toBe(strings['app.error.fallback.retry']);
  });

  it('useT() outside the provider falls back to the English translator', async () => {
    function Probe(): React.ReactNode {
      const tr = useT();
      return <span data-testid="probe">{tr('app.matrix.heading')}</span>;
    }
    const { container, unmount } = await renderToContainer(<Probe />);
    teardown = unmount;
    expect(container.querySelector('[data-testid="probe"]')?.textContent).toBe(
      strings['app.matrix.heading'],
    );
  });

  it('useT() inside I18nProvider with a stub returns the stubbed value', async () => {
    function Probe(): React.ReactNode {
      const tr = useT();
      return <span data-testid="probe">{tr('app.matrix.heading')}</span>;
    }
    const { container, unmount } = await renderToContainer(
      <I18nProvider translator={() => 'STUB'}>
        <Probe />
      </I18nProvider>,
    );
    teardown = unmount;
    expect(container.querySelector('[data-testid="probe"]')?.textContent).toBe('STUB');
  });
});
