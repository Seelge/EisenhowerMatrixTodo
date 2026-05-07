/**
 * I18nProvider exposes a translator through context so views can call
 * `useT()` instead of importing the string table directly. The default
 * value is the English `t` — components used outside the provider still
 * get translated strings, which keeps tests and Storybook-style harnesses
 * simple. Tests can pass a stub via `translator` to verify keys without
 * coupling to the English text.
 */
import { createContext, useContext, type ReactNode } from 'react';

import { t as defaultT, type Translator } from './t.js';

const I18nContext = createContext<Translator>(defaultT);

export interface I18nProviderProps {
  children?: ReactNode;
  translator?: Translator;
}

export function I18nProvider({ children, translator = defaultT }: I18nProviderProps): ReactNode {
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export function useT(): Translator {
  return useContext(I18nContext);
}
