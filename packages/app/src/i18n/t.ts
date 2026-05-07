/**
 * Default translator. Looks up `key` in the English string table.
 *
 * The signature is intentionally narrow (`StringKey -> string`) — the
 * type system rejects unknown keys at the call site, so this never has
 * to handle a missing entry at runtime.
 */
import { strings, type StringKey } from './strings.en.js';

export type Translator = (key: StringKey) => string;

export const t: Translator = (key) => strings[key];
