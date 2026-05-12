/**
 * Step 9.1 — Options sub-routing.
 *
 * Pure-function tests for the parser/predicate pair. Browser
 * back/forward is validated separately by the OptionsView render
 * test which drives `navigateRaw` + a synthetic `popstate`.
 */
import { describe, expect, it } from 'vitest';

import {
  isOptionsPath,
  parseOptionsGroup,
  optionsGroupPath,
} from '../src/views/options/options-routing.js';

describe('options-routing — Step 9.1', () => {
  it('isOptionsPath recognises the index and group paths', () => {
    expect(isOptionsPath('/options')).toBe(true);
    expect(isOptionsPath('/options/')).toBe(true);
    expect(isOptionsPath('/options/backends')).toBe(true);
    expect(isOptionsPath('/options/about?source=test')).toBe(true);
  });

  it('isOptionsPath rejects non-options paths', () => {
    expect(isOptionsPath('/')).toBe(false);
    expect(isOptionsPath('/q/Q2')).toBe(false);
    expect(isOptionsPath('/__debug')).toBe(false);
  });

  it('parseOptionsGroup returns undefined for the index', () => {
    expect(parseOptionsGroup('/options')).toBeUndefined();
    expect(parseOptionsGroup('/options/')).toBeUndefined();
  });

  it('parseOptionsGroup returns the slug for valid groups', () => {
    expect(parseOptionsGroup('/options/backends')).toBe('backends');
    expect(parseOptionsGroup('/options/about')).toBe('about');
  });

  it('parseOptionsGroup ignores unknown segments', () => {
    expect(parseOptionsGroup('/options/unknown')).toBeUndefined();
    expect(parseOptionsGroup('/options/backends/extra')).toBeUndefined();
  });

  it('optionsGroupPath round-trips with parseOptionsGroup', () => {
    expect(parseOptionsGroup(optionsGroupPath('backends'))).toBe('backends');
    expect(parseOptionsGroup(optionsGroupPath('about'))).toBe('about');
  });
});
